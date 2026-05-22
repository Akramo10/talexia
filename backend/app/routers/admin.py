from datetime import datetime, timedelta, timezone
from decimal import Decimal
from uuid import UUID

from dateutil.relativedelta import relativedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.deps import require_admin_user
from app.database import get_db
from app.models.application import Application
from app.models.document import Document
from app.models.email_campaign import CampaignLog, CampaignStatus, EmailCampaign, EmailRecipient, GmailToken, RecipientStatus
from app.models.subscription import SubscriptionHistory, SubscriptionPlan, SubscriptionStatus, UserSubscription
from app.models.user import User
from app.schemas.subscription import (
    AdminStatsResponse,
    AdminSubscriptionResponse,
    AdminUserResponse,
    AdminUserStatsResponse,
    SubscriptionChangePlanRequest,
    SubscriptionExtendRequest,
    SubscriptionGiftMonthsRequest,
    SubscriptionHistoryResponse,
    SubscriptionUpdateRequest,
    UserSubscriptionResponse,
)
from app.services.subscription_service import SubscriptionService

router = APIRouter(prefix="/admin", tags=["admin"])


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


async def _admin_count(db: AsyncSession) -> int:
    result = await db.execute(select(func.count(User.id)).where(User.is_admin.is_(True), User.is_active.is_(True)))
    return int(result.scalar_one() or 0)


async def _current_subscription_map(db: AsyncSession, users: list[User]) -> dict[UUID, UserSubscription]:
    if not users:
        return {}
    result = await db.execute(
        select(UserSubscription)
        .options(selectinload(UserSubscription.plan))
        .where(UserSubscription.user_id.in_([user.id for user in users]))
        .order_by(UserSubscription.ends_at.desc())
    )
    subscriptions: dict[UUID, UserSubscription] = {}
    for subscription in result.scalars().all():
        subscriptions.setdefault(subscription.user_id, subscription)
    return subscriptions


async def _gmail_connected_map(db: AsyncSession, users: list[User]) -> dict[UUID, bool]:
    if not users:
        return {}
    result = await db.execute(select(GmailToken.user_id).where(GmailToken.user_id.in_([user.id for user in users])))
    return {user_id: True for user_id in result.scalars().all()}


async def _last_activity_map(db: AsyncSession, users: list[User]) -> dict[UUID, datetime | None]:
    if not users:
        return {}
    user_ids = [user.id for user in users]
    app_result = await db.execute(
        select(Application.user_id, func.max(Application.last_contact_date))
        .where(Application.user_id.in_(user_ids))
        .group_by(Application.user_id)
    )
    campaign_result = await db.execute(
        select(EmailCampaign.user_id, func.max(EmailCampaign.updated_at))
        .where(EmailCampaign.user_id.in_(user_ids))
        .group_by(EmailCampaign.user_id)
    )
    activity: dict[UUID, datetime | None] = {}
    for user_id, value in app_result.all():
        activity[user_id] = value
    for user_id, value in campaign_result.all():
        current = activity.get(user_id)
        activity[user_id] = max([date for date in [current, value] if date], default=None)
    return activity


def _admin_user_response(
    user: User,
    subscription: UserSubscription | None,
    gmail_connected: bool,
    last_activity: datetime | None,
) -> AdminUserResponse:
    return AdminUserResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        phone=user.phone,
        is_admin=user.is_admin,
        is_active=user.is_active,
        status="active" if user.is_active else "suspended",
        gmail_connected=gmail_connected,
        created_at=user.created_at,
        last_activity=last_activity,
        subscription=UserSubscriptionResponse.model_validate(subscription) if subscription else None,
    )


def _admin_subscription_response(subscription: UserSubscription) -> AdminSubscriptionResponse:
    base = UserSubscriptionResponse.model_validate(subscription).model_dump()
    return AdminSubscriptionResponse(
        **base,
        user_email=subscription.user.email,
        user_name=subscription.user.full_name,
    )


async def _record_history(
    db: AsyncSession,
    subscription: UserSubscription,
    action: str,
    admin: User,
    old_value: str | None = None,
    new_value: str | None = None,
) -> None:
    db.add(
        SubscriptionHistory(
            user_id=subscription.user_id,
            subscription_id=subscription.id,
            action=action,
            old_value=old_value,
            new_value=new_value,
            performed_by_admin_id=admin.id,
        )
    )
    await db.flush()


@router.get("/stats", response_model=AdminStatsResponse)
async def admin_stats(_: User = Depends(require_admin_user), db: AsyncSession = Depends(get_db)):
    await SubscriptionService.ensure_default_plans(db)
    await db.commit()

    now = _utc_now()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = today_start - timedelta(days=today_start.weekday())

    total_users = int((await db.execute(select(func.count(User.id)))).scalar_one() or 0)
    active_users_today = int((await db.execute(select(func.count(User.id)).where(User.created_at >= today_start))).scalar_one() or 0)
    new_users_this_week = int((await db.execute(select(func.count(User.id)).where(User.created_at >= week_start))).scalar_one() or 0)
    total_applications = int((await db.execute(select(func.count(Application.id)))).scalar_one() or 0)
    email_campaigns_sent = int(
        (await db.execute(select(func.count(EmailCampaign.id)).where(EmailCampaign.status == CampaignStatus.COMPLETED))).scalar_one() or 0
    )
    emails_sent_today = int(
        (
            await db.execute(
                select(func.count(EmailRecipient.id)).where(
                    EmailRecipient.status == RecipientStatus.SENT,
                    EmailRecipient.sent_at >= today_start,
                )
            )
        ).scalar_one()
        or 0
    )
    s3_bytes = int((await db.execute(select(func.coalesce(func.sum(Document.size), 0)))).scalar_one() or 0)
    revenue_result = await db.execute(
        select(func.coalesce(func.sum(SubscriptionPlan.price_eur), 0))
        .select_from(UserSubscription)
        .join(SubscriptionPlan)
        .where(UserSubscription.status == SubscriptionStatus.ACTIVE)
    )
    estimated_revenue = Decimal(revenue_result.scalar_one() or 0)
    active_trials = await SubscriptionService.count_by_status(db, SubscriptionStatus.TRIAL)
    expired_subscriptions = await SubscriptionService.count_by_status(db, SubscriptionStatus.EXPIRED)

    return AdminStatsResponse(
        total_users=total_users,
        active_users_today=active_users_today,
        new_users_this_week=new_users_this_week,
        total_applications=total_applications,
        email_campaigns_sent=email_campaigns_sent,
        emails_sent_today=emails_sent_today,
        future_open_rate=None,
        s3_storage_used_mb=round(s3_bytes / 1024 / 1024, 2),
        estimated_revenue_eur=estimated_revenue,
        active_trials=active_trials,
        expired_subscriptions=expired_subscriptions,
    )


@router.get("/users", response_model=list[AdminUserResponse])
async def admin_users(_: User = Depends(require_admin_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).order_by(User.created_at.desc()))
    users = result.scalars().all()
    subscriptions = await _current_subscription_map(db, users)
    gmail = await _gmail_connected_map(db, users)
    activity = await _last_activity_map(db, users)
    return [_admin_user_response(user, subscriptions.get(user.id), gmail.get(user.id, False), activity.get(user.id)) for user in users]


@router.get("/users/{user_id}", response_model=AdminUserResponse)
async def admin_user_detail(user_id: UUID, _: User = Depends(require_admin_user), db: AsyncSession = Depends(get_db)):
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    subscriptions = await _current_subscription_map(db, [user])
    gmail = await _gmail_connected_map(db, [user])
    activity = await _last_activity_map(db, [user])
    return _admin_user_response(user, subscriptions.get(user.id), gmail.get(user.id, False), activity.get(user.id))


@router.get("/users/{user_id}/stats", response_model=AdminUserStatsResponse)
async def admin_user_stats(user_id: UUID, _: User = Depends(require_admin_user), db: AsyncSession = Depends(get_db)):
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    applications = int((await db.execute(select(func.count(Application.id)).where(Application.user_id == user_id))).scalar_one() or 0)
    documents = int((await db.execute(select(func.count(Document.id)).where(Document.user_id == user_id))).scalar_one() or 0)
    campaigns = int((await db.execute(select(func.count(EmailCampaign.id)).where(EmailCampaign.user_id == user_id))).scalar_one() or 0)
    sent = int(
        (
            await db.execute(
                select(func.count(EmailRecipient.id))
                .select_from(EmailRecipient)
                .join(EmailCampaign)
                .where(EmailCampaign.user_id == user_id, EmailRecipient.status == RecipientStatus.SENT)
            )
        ).scalar_one()
        or 0
    )
    gmail = (await db.execute(select(GmailToken.id).where(GmailToken.user_id == user_id))).scalars().first() is not None
    activity = (await _last_activity_map(db, [user])).get(user_id)
    return AdminUserStatsResponse(
        applications_count=applications,
        documents_count=documents,
        campaigns_count=campaigns,
        emails_sent_count=sent,
        gmail_connected=gmail,
        last_activity=activity,
    )


@router.put("/users/{user_id}/suspend", response_model=AdminUserResponse)
async def suspend_user(user_id: UUID, admin: User = Depends(require_admin_user), db: AsyncSession = Depends(get_db)):
    if user_id == admin.id:
        raise HTTPException(status_code=400, detail="You cannot suspend yourself")
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_active = False
    await db.commit()
    return await admin_user_detail(user_id, admin, db)


@router.put("/users/{user_id}/reactivate", response_model=AdminUserResponse)
async def reactivate_user(user_id: UUID, admin: User = Depends(require_admin_user), db: AsyncSession = Depends(get_db)):
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_active = True
    await db.commit()
    return await admin_user_detail(user_id, admin, db)


@router.delete("/users/{user_id}")
async def delete_user(user_id: UUID, admin: User = Depends(require_admin_user), db: AsyncSession = Depends(get_db)):
    if user_id == admin.id:
        raise HTTPException(status_code=400, detail="You cannot delete yourself")
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    await db.delete(user)
    await db.commit()
    return {"ok": True}


@router.put("/users/{user_id}/make-admin", response_model=AdminUserResponse)
async def make_admin(user_id: UUID, admin: User = Depends(require_admin_user), db: AsyncSession = Depends(get_db)):
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_admin = True
    user.is_active = True
    await db.commit()
    return await admin_user_detail(user_id, admin, db)


@router.put("/users/{user_id}/remove-admin", response_model=AdminUserResponse)
async def remove_admin(user_id: UUID, admin: User = Depends(require_admin_user), db: AsyncSession = Depends(get_db)):
    if user_id == admin.id and await _admin_count(db) <= 1:
        raise HTTPException(status_code=400, detail="You cannot remove the last admin")
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_admin = False
    await db.commit()
    return await admin_user_detail(user_id, admin, db)


@router.put("/users/{user_id}/subscription", response_model=UserSubscriptionResponse)
async def update_user_subscription(
    user_id: UUID,
    payload: SubscriptionUpdateRequest,
    admin: User = Depends(require_admin_user),
    db: AsyncSession = Depends(get_db),
):
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    plan = await db.get(SubscriptionPlan, payload.plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")

    subscription = await SubscriptionService.get_current_subscription(db, user_id)
    starts_at = payload.starts_at or _utc_now()
    ends_at = payload.ends_at or (starts_at + relativedelta(months=plan.duration_months))
    if subscription:
        old = f"{subscription.plan_id}:{subscription.status}:{subscription.ends_at.isoformat()}"
        subscription.plan_id = plan.id
        subscription.status = payload.status
        subscription.starts_at = starts_at
        subscription.ends_at = ends_at
    else:
        old = None
        subscription = UserSubscription(user_id=user_id, plan_id=plan.id, status=payload.status, starts_at=starts_at, ends_at=ends_at)
        db.add(subscription)
        await db.flush()
    await _record_history(db, subscription, "reset_subscription", admin, old, f"{plan.id}:{payload.status}:{ends_at.isoformat()}")
    await db.commit()
    return await SubscriptionService.get_current_subscription(db, user_id)


@router.get("/subscriptions", response_model=list[AdminSubscriptionResponse])
async def admin_subscriptions(_: User = Depends(require_admin_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(UserSubscription)
        .options(selectinload(UserSubscription.plan), selectinload(UserSubscription.user))
        .order_by(UserSubscription.ends_at.desc())
    )
    return [_admin_subscription_response(subscription) for subscription in result.scalars().all()]


async def _get_subscription(db: AsyncSession, subscription_id: UUID) -> UserSubscription:
    result = await db.execute(
        select(UserSubscription)
        .options(selectinload(UserSubscription.plan), selectinload(UserSubscription.user))
        .where(UserSubscription.id == subscription_id)
    )
    subscription = result.scalars().first()
    if not subscription:
        raise HTTPException(status_code=404, detail="Subscription not found")
    return subscription


@router.put("/subscriptions/{subscription_id}/extend", response_model=AdminSubscriptionResponse)
async def extend_subscription(
    subscription_id: UUID,
    payload: SubscriptionExtendRequest,
    admin: User = Depends(require_admin_user),
    db: AsyncSession = Depends(get_db),
):
    subscription = await _get_subscription(db, subscription_id)
    old = subscription.ends_at.isoformat()
    subscription.ends_at = subscription.ends_at + relativedelta(months=payload.months)
    subscription.status = SubscriptionStatus.ACTIVE
    await _record_history(db, subscription, "extend", admin, old, subscription.ends_at.isoformat())
    await db.commit()
    return _admin_subscription_response(await _get_subscription(db, subscription_id))


@router.put("/subscriptions/{subscription_id}/change-plan", response_model=AdminSubscriptionResponse)
async def change_subscription_plan(
    subscription_id: UUID,
    payload: SubscriptionChangePlanRequest,
    admin: User = Depends(require_admin_user),
    db: AsyncSession = Depends(get_db),
):
    subscription = await _get_subscription(db, subscription_id)
    plan = await db.get(SubscriptionPlan, payload.plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    old = str(subscription.plan_id)
    subscription.plan_id = plan.id
    subscription.status = SubscriptionStatus.ACTIVE
    if payload.reset_dates:
        subscription.starts_at = _utc_now()
        subscription.ends_at = subscription.starts_at + relativedelta(months=plan.duration_months)
    await _record_history(db, subscription, "change_plan", admin, old, str(plan.id))
    await db.commit()
    return _admin_subscription_response(await _get_subscription(db, subscription_id))


@router.put("/subscriptions/{subscription_id}/gift-months", response_model=AdminSubscriptionResponse)
async def gift_subscription_months(
    subscription_id: UUID,
    payload: SubscriptionGiftMonthsRequest,
    admin: User = Depends(require_admin_user),
    db: AsyncSession = Depends(get_db),
):
    subscription = await _get_subscription(db, subscription_id)
    old = subscription.ends_at.isoformat()
    subscription.ends_at = subscription.ends_at + relativedelta(months=payload.months)
    subscription.status = SubscriptionStatus.ACTIVE
    await _record_history(db, subscription, "gift_months", admin, old, subscription.ends_at.isoformat())
    await db.commit()
    return _admin_subscription_response(await _get_subscription(db, subscription_id))


@router.get("/subscriptions/{subscription_id}/history", response_model=list[SubscriptionHistoryResponse])
async def subscription_history(subscription_id: UUID, _: User = Depends(require_admin_user), db: AsyncSession = Depends(get_db)):
    await _get_subscription(db, subscription_id)
    result = await db.execute(
        select(SubscriptionHistory)
        .where(SubscriptionHistory.subscription_id == subscription_id)
        .order_by(SubscriptionHistory.created_at.desc())
    )
    return result.scalars().all()
