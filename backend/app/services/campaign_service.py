import logging
import re
import uuid
from uuid import UUID

from fastapi import HTTPException, UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.models.email_campaign import (
    CampaignStatus,
    EmailAttachment,
    EmailCampaign,
    EmailRecipient,
    RecipientStatus,
)
from app.schemas.campaign import EmailCampaignCreate, EmailCampaignUpdate, EmailRecipientCreate, EmailRecipientUpdate
from app.services.s3_service import S3Service

logger = logging.getLogger(__name__)


def _safe_filename(filename: str | None) -> str:
    name = (filename or "attachment").strip().replace("\\", "-").replace("/", "-")
    name = re.sub(r"[^A-Za-z0-9._ -]+", "-", name)
    name = re.sub(r"\s+", "-", name).strip(".- ")
    return name or "attachment"


def upload_campaign_attachment_to_s3(user_id: UUID, campaign_id: UUID, file: UploadFile) -> tuple[str, str, int, str | None]:
    original_filename = file.filename or "attachment"
    safe_name = _safe_filename(original_filename)
    s3_key = f"users/{user_id}/campaigns/{campaign_id}/attachments/{uuid.uuid4()}-{safe_name}"
    content_type = file.content_type or "application/octet-stream"
    file.file.seek(0, 2)
    size = file.file.tell()
    file.file.seek(0)
    S3Service.upload_fileobj_to_s3(file.file, s3_key, content_type)
    return safe_name, s3_key, size, content_type


class CampaignService:
    @staticmethod
    def counts(campaign: EmailCampaign) -> dict[str, int]:
        recipients = campaign.recipients or []
        return {
            "total_recipients": len(recipients),
            "sent_count": sum(1 for item in recipients if item.status == RecipientStatus.SENT),
            "failed_count": sum(1 for item in recipients if item.status == RecipientStatus.FAILED),
            "pending_count": sum(1 for item in recipients if item.status == RecipientStatus.PENDING),
            "skipped_count": sum(1 for item in recipients if item.status == RecipientStatus.SKIPPED),
        }

    @classmethod
    async def get_campaign(cls, db: AsyncSession, campaign_id: UUID, user_id: UUID) -> EmailCampaign:
        query = (
            select(EmailCampaign)
            .options(selectinload(EmailCampaign.recipients), selectinload(EmailCampaign.attachments))
            .where(EmailCampaign.id == campaign_id, EmailCampaign.user_id == user_id)
        )
        result = await db.execute(query)
        campaign = result.scalars().first()
        if not campaign:
            raise HTTPException(status_code=404, detail="Campaign not found")
        return campaign

    @classmethod
    async def create_campaign(cls, db: AsyncSession, user_id: UUID, payload: EmailCampaignCreate) -> EmailCampaign:
        data = payload.model_dump()
        if data.get("send_delay_seconds") is None:
            data["send_delay_seconds"] = settings.default_email_send_delay_seconds
        campaign = EmailCampaign(user_id=user_id, **data)
        db.add(campaign)
        await db.commit()
        return await cls.get_campaign(db, campaign.id, user_id)

    @classmethod
    async def update_campaign(cls, db: AsyncSession, campaign: EmailCampaign, payload: EmailCampaignUpdate) -> EmailCampaign:
        for key, value in payload.model_dump(exclude_unset=True).items():
            setattr(campaign, key, value)
        await db.commit()
        return await cls.get_campaign(db, campaign.id, campaign.user_id)

    @classmethod
    async def duplicate_campaign(cls, db: AsyncSession, campaign: EmailCampaign) -> EmailCampaign:
        copy = EmailCampaign(
            user_id=campaign.user_id,
            name=f"{campaign.name} (copie)",
            subject=campaign.subject,
            body=campaign.body,
            send_delay_seconds=campaign.send_delay_seconds,
            status=CampaignStatus.DRAFT,
        )
        db.add(copy)
        await db.flush()
        for recipient in campaign.recipients:
            db.add(
                EmailRecipient(
                    campaign_id=copy.id,
                    email=recipient.email,
                    company_name=recipient.company_name,
                    contact_name=recipient.contact_name,
                    status=RecipientStatus.PENDING,
                )
            )
        await db.commit()
        return await cls.get_campaign(db, copy.id, campaign.user_id)

    @classmethod
    async def add_recipient(cls, db: AsyncSession, campaign: EmailCampaign, payload: EmailRecipientCreate) -> EmailRecipient:
        recipient = EmailRecipient(campaign_id=campaign.id, **payload.model_dump())
        db.add(recipient)
        await db.commit()
        await db.refresh(recipient)
        return recipient

    @staticmethod
    async def update_recipient(db: AsyncSession, recipient: EmailRecipient, payload: EmailRecipientUpdate) -> EmailRecipient:
        for key, value in payload.model_dump(exclude_unset=True).items():
            setattr(recipient, key, value)
        await db.commit()
        await db.refresh(recipient)
        return recipient

    @staticmethod
    async def get_recipient(db: AsyncSession, campaign_id: UUID, recipient_id: UUID) -> EmailRecipient:
        result = await db.execute(
            select(EmailRecipient).where(EmailRecipient.id == recipient_id, EmailRecipient.campaign_id == campaign_id)
        )
        recipient = result.scalars().first()
        if not recipient:
            raise HTTPException(status_code=404, detail="Recipient not found")
        return recipient

    @staticmethod
    async def save_attachment(db: AsyncSession, campaign: EmailCampaign, file: UploadFile, label: str | None = None) -> EmailAttachment:
        display_name = _safe_filename(label or file.filename)
        safe_name, s3_key, size, content_type = upload_campaign_attachment_to_s3(campaign.user_id, campaign.id, file)
        original_filename = file.filename or display_name
        logger.info(
            "Campaign attachment uploaded: user_id=%s campaign_id=%s key=%s size=%s",
            campaign.user_id,
            campaign.id,
            s3_key,
            size,
        )

        attachment = EmailAttachment(
            campaign_id=campaign.id,
            user_id=campaign.user_id,
            original_filename=original_filename,
            s3_key=s3_key,
            mime_type=content_type,
            size=size,
            file_name=display_name or safe_name,
            file_path=s3_key,
            content_type=content_type,
            size_bytes=size,
        )
        db.add(attachment)
        await db.commit()
        await db.refresh(attachment)
        return attachment

    @staticmethod
    async def get_attachment(db: AsyncSession, campaign_id: UUID, attachment_id: UUID) -> EmailAttachment:
        result = await db.execute(
            select(EmailAttachment).where(EmailAttachment.id == attachment_id, EmailAttachment.campaign_id == campaign_id)
        )
        attachment = result.scalars().first()
        if not attachment:
            raise HTTPException(status_code=404, detail="Attachment not found")
        return attachment

    @classmethod
    async def delete_attachment(cls, db: AsyncSession, campaign_id: UUID, attachment_id: UUID) -> None:
        attachment = await cls.get_attachment(db, campaign_id, attachment_id)
        s3_key = attachment.s3_key or attachment.file_path
        if s3_key:
            S3Service.delete_file_from_s3(s3_key)
        await db.delete(attachment)
        await db.commit()

    @classmethod
    async def get_attachment_download_url(cls, db: AsyncSession, campaign_id: UUID, attachment_id: UUID, expires_in: int = 900) -> str:
        attachment = await cls.get_attachment(db, campaign_id, attachment_id)
        s3_key = attachment.s3_key or attachment.file_path
        filename = attachment.original_filename or attachment.file_name
        return S3Service.generate_presigned_download_url(s3_key, filename, expires_in=expires_in)
