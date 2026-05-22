import asyncio
import logging
from datetime import datetime, timezone

from app.database import AsyncSessionLocal
from app.services.subscription_email_service import SubscriptionEmailService

logger = logging.getLogger(__name__)


class SubscriptionScheduler:
    _task: asyncio.Task | None = None
    _stopped = False
    _last_run_day: str | None = None

    @classmethod
    def start(cls) -> None:
        if cls._task and not cls._task.done():
            return
        cls._stopped = False
        cls._task = asyncio.create_task(cls._run(), name="subscription-scheduler")
        logger.info("Subscription scheduler started")

    @classmethod
    async def stop(cls) -> None:
        cls._stopped = True
        if cls._task:
            cls._task.cancel()
            try:
                await cls._task
            except asyncio.CancelledError:
                pass
        logger.info("Subscription scheduler stopped")

    @classmethod
    async def _run(cls) -> None:
        while not cls._stopped:
            today = datetime.now(timezone.utc).date().isoformat()
            if cls._last_run_day != today:
                try:
                    async with AsyncSessionLocal() as db:
                        await SubscriptionEmailService.process_daily_reminders(db)
                    cls._last_run_day = today
                except Exception:
                    logger.exception("Subscription scheduler tick failed")
            await asyncio.sleep(3600)
