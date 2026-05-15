import asyncio
from datetime import datetime, timezone
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.email_campaign import CampaignLogLevel, CampaignStatus, EmailCampaign, GmailToken, RecipientStatus
from app.services.campaign_log_service import CampaignLogService
from app.services.gmail_service import GmailService


class CampaignSender:
    @staticmethod
    async def send(db: AsyncSession, campaign: EmailCampaign, gmail_token: GmailToken, delay_seconds: int) -> None:
        campaign.status = CampaignStatus.SENDING
        campaign.started_at = campaign.started_at or datetime.now(timezone.utc)
        campaign.completed_at = None
        campaign.cancelled_at = None
        await CampaignLogService.add(db, campaign.id, "Connecting Gmail API...", CampaignLogLevel.INFO)
        await db.commit()

        attachments = [attachment.file_path for attachment in campaign.attachments]
        has_failure = False

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
                attachments=attachments,
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

    @staticmethod
    async def get_gmail_token(db: AsyncSession, user_id: UUID) -> GmailToken:
        token_result = await db.execute(select(GmailToken).where(GmailToken.user_id == user_id))
        gmail_token = token_result.scalars().first()
        if not gmail_token:
            raise HTTPException(status_code=400, detail="Gmail is not connected")
        return gmail_token
