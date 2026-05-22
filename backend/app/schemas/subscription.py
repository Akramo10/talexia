from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.models.subscription import SubscriptionStatus


class SubscriptionPlanResponse(BaseModel):
    id: UUID
    name: str
    duration_months: int
    price_eur: Decimal
    is_active: bool
    created_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class UserSubscriptionResponse(BaseModel):
    id: UUID
    user_id: UUID
    plan_id: UUID
    status: SubscriptionStatus
    starts_at: datetime
    ends_at: datetime
    created_at: datetime
    updated_at: datetime
    plan: SubscriptionPlanResponse

    model_config = ConfigDict(from_attributes=True)


class AdminSubscriptionResponse(UserSubscriptionResponse):
    user_email: str
    user_name: str | None = None


class SubscriptionUpdateRequest(BaseModel):
    plan_id: UUID
    status: SubscriptionStatus = SubscriptionStatus.ACTIVE
    starts_at: datetime | None = None
    ends_at: datetime | None = None


class SubscriptionExtendRequest(BaseModel):
    months: int = Field(gt=0, le=36)


class SubscriptionChangePlanRequest(BaseModel):
    plan_id: UUID
    reset_dates: bool = True


class SubscriptionGiftMonthsRequest(BaseModel):
    months: int = Field(gt=0, le=24)


class SubscriptionHistoryResponse(BaseModel):
    id: UUID
    user_id: UUID
    subscription_id: UUID
    action: str
    old_value: str | None = None
    new_value: str | None = None
    performed_by_admin_id: UUID | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AdminStatsResponse(BaseModel):
    total_users: int
    active_users_today: int
    new_users_this_week: int
    total_applications: int
    email_campaigns_sent: int
    emails_sent_today: int
    future_open_rate: float | None = None
    s3_storage_used_mb: float
    estimated_revenue_eur: Decimal
    active_trials: int
    expired_subscriptions: int


class AdminUserStatsResponse(BaseModel):
    applications_count: int
    documents_count: int
    campaigns_count: int
    emails_sent_count: int
    gmail_connected: bool
    last_activity: datetime | None = None


class AdminUserResponse(BaseModel):
    id: UUID
    email: str
    full_name: str | None = None
    phone: str | None = None
    is_admin: bool
    is_active: bool
    status: str
    gmail_connected: bool = False
    created_at: datetime
    last_activity: datetime | None = None
    subscription: UserSubscriptionResponse | None = None

    model_config = ConfigDict(from_attributes=True)
