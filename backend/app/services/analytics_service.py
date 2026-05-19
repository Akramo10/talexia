from collections import Counter, defaultdict
from datetime import datetime, timedelta, timezone
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.application import Application, ApplicationStatus


class AnalyticsService:
    @staticmethod
    def resolve_period(period: str, start_date: Optional[datetime], end_date: Optional[datetime]) -> tuple[datetime, datetime]:
        now = datetime.now(timezone.utc)
        if period == "custom" and start_date and end_date:
            return start_date, end_date
        if period == "today":
            start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        elif period == "week":
            start = (now - timedelta(days=now.weekday())).replace(hour=0, minute=0, second=0, microsecond=0)
        elif period == "month":
            start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        else:
            start = now - timedelta(days=30)
        return start, now

    @staticmethod
    async def get_user_analytics(
        db: AsyncSession,
        user_id,
        period: str = "30d",
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> dict:
        start, end = AnalyticsService.resolve_period(period, start_date, end_date)
        result = await db.execute(select(Application).where(Application.user_id == user_id))
        applications = result.scalars().all()

        filtered = [
            app for app in applications
            if app.date_sent and start <= app.date_sent <= end
        ]
        sent = [app for app in filtered if app.status != ApplicationStatus.WISHLIST]
        responses = [
            app for app in filtered
            if app.status in {
                ApplicationStatus.FOLLOW_UP,
                ApplicationStatus.INTERVIEW,
                ApplicationStatus.TECHNICAL_TEST,
                ApplicationStatus.REJECTED,
                ApplicationStatus.OFFER,
            }
        ]
        interviews = [app for app in filtered if app.status in {ApplicationStatus.INTERVIEW, ApplicationStatus.TECHNICAL_TEST}]
        rejected = [app for app in filtered if app.status == ApplicationStatus.REJECTED]

        by_day: dict[str, int] = defaultdict(int)
        for app in filtered:
            if app.date_sent:
                by_day[app.date_sent.date().isoformat()] += 1

        offers_by_contract = Counter(app.type.value for app in filtered if app.status == ApplicationStatus.OFFER)
        contract_distribution = Counter(app.type.value for app in filtered)
        pipeline = Counter(app.status.value for app in applications)

        return {
            "period": {"start": start.isoformat(), "end": end.isoformat()},
            "sent_count": len(sent),
            "responses_count": len(responses),
            "response_rate": round((len(responses) / len(sent)) * 100, 1) if sent else 0,
            "interviews_count": len(interviews),
            "rejected_count": len(rejected),
            "offers_by_contract": dict(offers_by_contract),
            "applications_by_day": [{"date": key, "count": by_day[key]} for key in sorted(by_day)],
            "contract_distribution": dict(contract_distribution),
            "pipeline": dict(pipeline),
        }
