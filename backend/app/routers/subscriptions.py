from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user
from app.database import get_db
from app.models.subscription import SubscriptionPlan
from app.models.user import User
from app.schemas.subscription import SubscriptionPlanResponse, UserSubscriptionResponse
from app.services.subscription_service import SubscriptionService

router = APIRouter(prefix="/subscriptions", tags=["subscriptions"])


@router.get("/plans", response_model=list[SubscriptionPlanResponse])
async def list_plans(db: AsyncSession = Depends(get_db)):
    await SubscriptionService.ensure_default_plans(db)
    await db.commit()
    result = await db.execute(select(SubscriptionPlan).where(SubscriptionPlan.is_active.is_(True)).order_by(SubscriptionPlan.duration_months.asc()))
    return result.scalars().all()


@router.get("/me", response_model=UserSubscriptionResponse | None)
async def my_subscription(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    return await SubscriptionService.get_current_subscription(db, current_user.id)
