import asyncio
import logging
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.database import AsyncSessionLocal
from app.models.email_campaign import CampaignLogLevel, CampaignStatus, EmailCampaign
from app.services.campaign_log_service import CampaignLogService
from app.services.campaign_sender import CampaignSender

logger = logging.getLogger(__name__)


class CampaignScheduler:
    _task: asyncio.Task | None = None
    _stopped = False

    @classmethod
    def start(cls) -> None:
        if cls._task and not cls._task.done():
            return
        cls._stopped = False
        cls._task = asyncio.create_task(cls._run(), name="campaign-scheduler")
        logger.info("Campaign scheduler started")

    @classmethod
    async def stop(cls) -> None:
        cls._stopped = True
        if cls._task:
            cls._task.cancel()
            try:
                await cls._task
            except asyncio.CancelledError:
                pass
        logger.info("Campaign scheduler stopped")

    @classmethod
    async def _run(cls) -> None:
        while not cls._stopped:
            try:
                await cls._tick()
            except Exception:
                logger.exception("Campaign scheduler tick failed")
            await asyncio.sleep(30)

    @staticmethod
    async def _tick() -> None:
        now = datetime.now(timezone.utc)
        async with AsyncSessionLocal() as db:
            result = await db.execute(
                select(EmailCampaign)
                .options(selectinload(EmailCampaign.recipients), selectinload(EmailCampaign.attachments))
                .where(
                    EmailCampaign.status == CampaignStatus.SCHEDULED,
                    EmailCampaign.scheduled_at.is_not(None),
                    EmailCampaign.scheduled_at <= now,
                )
                .order_by(EmailCampaign.scheduled_at.asc())
                .limit(5)
            )
            campaigns = result.scalars().all()

            for campaign in campaigns:
                try:
                    scheduled_at = campaign.scheduled_at
                    if scheduled_at and scheduled_at.tzinfo is None:
                        scheduled_at = scheduled_at.replace(tzinfo=timezone.utc)
                    if scheduled_at and scheduled_at > now:
                        continue
                    gmail_token = await CampaignSender.get_gmail_token(db, campaign.user_id)
                    await CampaignLogService.add(db, campaign.id, "Scheduled campaign started automatically.", CampaignLogLevel.INFO)
                    await db.commit()
                    await CampaignSender.send(db, campaign, gmail_token, campaign.send_delay_seconds)
                except Exception as exc:
                    campaign.status = CampaignStatus.FAILED
                    campaign.completed_at = datetime.now(timezone.utc)
                    await CampaignLogService.add(db, campaign.id, f"Scheduled send failed: {exc}", CampaignLogLevel.ERROR)
                    await db.commit()
