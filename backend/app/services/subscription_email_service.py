import logging
from datetime import date, datetime, time, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.subscription import ReminderType, SubscriptionReminderLog, SubscriptionStatus, UserSubscription
from app.services.email_service import send_subscription_expired_email, send_subscription_reminder_email

logger = logging.getLogger(__name__)


class SubscriptionEmailService:
    REMINDERS = {
        15: (ReminderType.TRIAL_D15, ReminderType.SUBSCRIPTION_D15),
        5: (ReminderType.TRIAL_D5, ReminderType.SUBSCRIPTION_D5),
        1: (ReminderType.TRIAL_D1, ReminderType.SUBSCRIPTION_D1),
    }

    @staticmethod
    def _day_bounds(target: date) -> tuple[datetime, datetime]:
        start = datetime.combine(target, time.min, tzinfo=timezone.utc)
        end = datetime.combine(target, time.max, tzinfo=timezone.utc)
        return start, end

    @staticmethod
    async def _already_sent(db: AsyncSession, subscription_id, reminder_type: ReminderType) -> bool:
        result = await db.execute(
            select(SubscriptionReminderLog).where(
                SubscriptionReminderLog.user_subscription_id == subscription_id,
                SubscriptionReminderLog.reminder_type == reminder_type,
            )
        )
        return result.scalars().first() is not None

    @staticmethod
    async def _mark_sent(db: AsyncSession, subscription_id, reminder_type: ReminderType) -> None:
        db.add(SubscriptionReminderLog(user_subscription_id=subscription_id, reminder_type=reminder_type))
        await db.flush()

    @classmethod
    async def process_daily_reminders(cls, db: AsyncSession) -> int:
        now = datetime.now(timezone.utc)
        sent_count = 0

        for days_left, reminder_types in cls.REMINDERS.items():
            target_date = now.date().toordinal() + days_left
            day_start, day_end = cls._day_bounds(date.fromordinal(target_date))
            result = await db.execute(
                select(UserSubscription)
                .options(selectinload(UserSubscription.user), selectinload(UserSubscription.plan))
                .where(
                    UserSubscription.status.in_([SubscriptionStatus.TRIAL, SubscriptionStatus.ACTIVE]),
                    UserSubscription.ends_at >= day_start,
                    UserSubscription.ends_at <= day_end,
                )
            )
            for subscription in result.scalars().all():
                is_trial = subscription.status == SubscriptionStatus.TRIAL
                reminder_type = reminder_types[0] if is_trial else reminder_types[1]
                if await cls._already_sent(db, subscription.id, reminder_type):
                    continue
                if send_subscription_reminder_email(
                    subscription.user.email,
                    subscription.plan.name,
                    subscription.ends_at,
                    days_left,
                    is_trial,
                ):
                    await cls._mark_sent(db, subscription.id, reminder_type)
                    sent_count += 1

        expired_result = await db.execute(
            select(UserSubscription)
            .options(selectinload(UserSubscription.user), selectinload(UserSubscription.plan))
            .where(
                UserSubscription.status.in_([SubscriptionStatus.TRIAL, SubscriptionStatus.ACTIVE]),
                UserSubscription.ends_at < now,
            )
        )
        for subscription in expired_result.scalars().all():
            if not await cls._already_sent(db, subscription.id, ReminderType.EXPIRED):
                if send_subscription_expired_email(subscription.user.email, subscription.plan.name):
                    await cls._mark_sent(db, subscription.id, ReminderType.EXPIRED)
                    sent_count += 1
            subscription.status = SubscriptionStatus.EXPIRED

        await db.commit()
        logger.info("Subscription reminders processed: %s email(s) sent", sent_count)
        return sent_count
