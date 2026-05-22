from datetime import datetime, timezone
from decimal import Decimal
from uuid import UUID

from dateutil.relativedelta import relativedelta
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.subscription import SubscriptionPlan, SubscriptionStatus, UserSubscription

PLAN_DEFINITIONS = {
    "trial_3_months": {"name": "Trial gratuit", "duration_months": 3, "price_eur": Decimal("0.00")},
    "six_months": {"name": "Plan 6 mois", "duration_months": 6, "price_eur": Decimal("30.00")},
    "twelve_months": {"name": "Plan 12 mois", "duration_months": 12, "price_eur": Decimal("50.00")},
}
DEFAULT_PLAN_KEY = "trial_3_months"
DEFAULT_PLANS = tuple(PLAN_DEFINITIONS.values())


class SubscriptionService:
    @staticmethod
    async def ensure_default_plans(db: AsyncSession) -> None:
        for plan_data in DEFAULT_PLANS:
            result = await db.execute(select(SubscriptionPlan).where(SubscriptionPlan.name == plan_data["name"]))
            plan = result.scalars().first()
            if plan:
                plan.duration_months = plan_data["duration_months"]
                plan.price_eur = plan_data["price_eur"]
                plan.is_active = True
                continue
            db.add(SubscriptionPlan(**plan_data, is_active=True))
        await db.flush()

    @staticmethod
    async def get_trial_plan(db: AsyncSession) -> SubscriptionPlan:
        await SubscriptionService.ensure_default_plans(db)
        result = await db.execute(select(SubscriptionPlan).where(SubscriptionPlan.name == PLAN_DEFINITIONS[DEFAULT_PLAN_KEY]["name"]))
        return result.scalars().one()

    @staticmethod
    async def get_plan_by_key(db: AsyncSession, plan_key: str) -> SubscriptionPlan:
        if plan_key not in PLAN_DEFINITIONS:
            raise ValueError("Invalid subscription plan")
        await SubscriptionService.ensure_default_plans(db)
        result = await db.execute(select(SubscriptionPlan).where(SubscriptionPlan.name == PLAN_DEFINITIONS[plan_key]["name"]))
        return result.scalars().one()

    @staticmethod
    async def create_trial_for_user(db: AsyncSession, user_id: UUID, starts_at: datetime | None = None) -> UserSubscription:
        return await SubscriptionService.create_subscription_for_user(db, user_id, DEFAULT_PLAN_KEY, starts_at)

    @staticmethod
    async def create_subscription_for_user(
        db: AsyncSession,
        user_id: UUID,
        plan_key: str = DEFAULT_PLAN_KEY,
        starts_at: datetime | None = None,
    ) -> UserSubscription:
        starts_at = starts_at or datetime.now(timezone.utc)
        plan = await SubscriptionService.get_plan_by_key(db, plan_key)
        status = SubscriptionStatus.TRIAL if plan_key == DEFAULT_PLAN_KEY else SubscriptionStatus.ACTIVE
        subscription = UserSubscription(
            user_id=user_id,
            plan_id=plan.id,
            status=status,
            starts_at=starts_at,
            ends_at=starts_at + relativedelta(months=plan.duration_months),
        )
        db.add(subscription)
        await db.flush()
        await db.refresh(subscription, ["plan"])
        return subscription

    @staticmethod
    async def get_current_subscription(db: AsyncSession, user_id: UUID) -> UserSubscription | None:
        result = await db.execute(
            select(UserSubscription)
            .options(selectinload(UserSubscription.plan))
            .where(UserSubscription.user_id == user_id)
            .order_by(UserSubscription.ends_at.desc())
            .limit(1)
        )
        return result.scalars().first()

    @staticmethod
    async def count_by_status(db: AsyncSession, status: SubscriptionStatus) -> int:
        result = await db.execute(select(func.count(UserSubscription.id)).where(UserSubscription.status == status))
        return int(result.scalar_one() or 0)
