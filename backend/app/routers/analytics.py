from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user
from app.database import get_db
from app.models.user import User
from app.services.analytics_service import AnalyticsService

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/")
async def read_analytics(
    period: str = "30d",
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await AnalyticsService.get_user_analytics(db, current_user.id, period, start_date, end_date)
