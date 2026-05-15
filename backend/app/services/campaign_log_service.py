from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.email_campaign import CampaignLog, CampaignLogLevel


class CampaignLogService:
    @staticmethod
    async def add(
        db: AsyncSession,
        campaign_id: UUID,
        message: str,
        level: CampaignLogLevel = CampaignLogLevel.INFO,
        recipient_id: UUID | None = None,
    ) -> CampaignLog:
        log = CampaignLog(
            campaign_id=campaign_id,
            message=message,
            level=level,
            recipient_id=recipient_id,
        )
        db.add(log)
        await db.flush()
        return log
