import os
import shutil
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


ATTACHMENT_DIR = "campaign_attachments"
os.makedirs(ATTACHMENT_DIR, exist_ok=True)


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
        safe_name = "".join(c for c in (label or file.filename or "attachment") if c.isalnum() or c in ("-", "_", ".", " ")).strip()
        if not safe_name:
            safe_name = "attachment"
        unique_name = f"{campaign.id}_{safe_name}"
        file_path = os.path.join(ATTACHMENT_DIR, unique_name)
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        attachment = EmailAttachment(
            campaign_id=campaign.id,
            file_name=safe_name,
            file_path=file_path,
            content_type=file.content_type,
            size_bytes=os.path.getsize(file_path),
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
        if os.path.exists(attachment.file_path):
            os.remove(attachment.file_path)
        await db.delete(attachment)
        await db.commit()
