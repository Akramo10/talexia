import asyncio
import logging
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.email_campaign import CampaignLogLevel, CampaignStatus, EmailCampaign, GmailToken, RecipientStatus
from app.services.campaign_log_service import CampaignLogService
from app.services.gmail_service import GmailService
from app.services.s3_service import S3Service

logger = logging.getLogger(__name__)


class CampaignSender:
    @staticmethod
    async def send(db: AsyncSession, campaign: EmailCampaign, gmail_token: GmailToken, delay_seconds: int) -> None:
        if gmail_token.user_id != campaign.user_id:
            raise HTTPException(status_code=403, detail="Gmail token does not belong to this campaign owner")
        logger.info("Sending campaign %s using Gmail token of user_id %s", campaign.id, gmail_token.user_id)
        campaign.status = CampaignStatus.SENDING
        campaign.started_at = campaign.started_at or datetime.now(timezone.utc)
        campaign.completed_at = None
        campaign.cancelled_at = None
        await CampaignLogService.add(db, campaign.id, "Connecting Gmail API...", CampaignLogLevel.INFO)
        await db.commit()

        has_failure = False
        temp_dir = tempfile.TemporaryDirectory(prefix="telxia-campaign-attachments-")
        attachment_paths: list[str] = []

        try:
            for attachment in campaign.attachments:
                s3_key = attachment.s3_key or attachment.file_path
                filename = Path(attachment.original_filename or attachment.file_name or Path(s3_key).name).name
                local_path = Path(temp_dir.name) / filename
                if s3_key and not Path(s3_key).is_file():
                    S3Service.download_file_from_s3(s3_key, local_path)
                    attachment_paths.append(str(local_path))
                elif Path(s3_key).is_file():
                    attachment_paths.append(s3_key)

            for index, recipient in enumerate(campaign.recipients):
                await db.refresh(campaign)
                while campaign.status == CampaignStatus.PAUSED:
                    await CampaignLogService.add(db, campaign.id, "Campaign paused. Waiting before next email.", CampaignLogLevel.WARNING)
                    await db.commit()
                    await asyncio.sleep(2)
                    await db.refresh(campaign)

                if campaign.status == CampaignStatus.CANCELLED:
                    recipient.status = RecipientStatus.SKIPPED if recipient.status == RecipientStatus.PENDING else recipient.status
                    await CampaignLogService.add(db, campaign.id, "Campaign cancelled. Sending stopped.", CampaignLogLevel.WARNING)
                    await db.commit()
                    return

                if recipient.status == RecipientStatus.SENT:
                    continue
                if recipient.status == RecipientStatus.SKIPPED:
                    continue

                recipient.status = RecipientStatus.PENDING
                recipient.error_message = None
                await CampaignLogService.add(db, campaign.id, f"Sending email to {recipient.email}", CampaignLogLevel.INFO, recipient.id)
                await db.commit()

                ok, info = await GmailService.send_email(
                    db=db,
                    token=gmail_token,
                    to=recipient.email,
                    subject=campaign.subject,
                    body_text=campaign.body,
                    attachments=attachment_paths,
                )
                if ok:
                    recipient.status = RecipientStatus.SENT
                    recipient.sent_at = datetime.now(timezone.utc)
                    await CampaignLogService.add(db, campaign.id, f"Email sent successfully to {recipient.email}", CampaignLogLevel.SUCCESS, recipient.id)
                else:
                    has_failure = True
                    recipient.status = RecipientStatus.FAILED
                    recipient.error_message = info
                    await CampaignLogService.add(db, campaign.id, f"Failed for {recipient.email}: {info}", CampaignLogLevel.ERROR, recipient.id)
                await db.commit()

                if delay_seconds > 0 and index < len(campaign.recipients) - 1:
                    await asyncio.sleep(delay_seconds)

            campaign.status = CampaignStatus.FAILED if has_failure else CampaignStatus.COMPLETED
            campaign.completed_at = datetime.now(timezone.utc)
            await CampaignLogService.add(
                db,
                campaign.id,
                "Campaign completed with errors." if has_failure else "Campaign completed successfully.",
                CampaignLogLevel.ERROR if has_failure else CampaignLogLevel.SUCCESS,
            )
            await db.commit()
        finally:
            temp_dir.cleanup()

    @staticmethod
    async def get_gmail_token(db: AsyncSession, user_id: UUID) -> GmailToken:
        token_result = await db.execute(select(GmailToken).where(GmailToken.user_id == user_id))
        gmail_token = token_result.scalars().first()
        if not gmail_token:
            raise HTTPException(status_code=400, detail="Gmail non connecté")
        return gmail_token
