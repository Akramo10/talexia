from typing import Optional
from pydantic import BaseModel, ConfigDict
from uuid import UUID
from datetime import datetime
from app.models.application import ApplicationStatus, ApplicationType
from app.schemas.company import CompanyResponse

class ApplicationBase(BaseModel):
    company_id: UUID
    date_sent: Optional[datetime] = None
    last_contact_date: Optional[datetime] = None
    status: Optional[ApplicationStatus] = ApplicationStatus.WISHLIST
    salary_proposed: Optional[str] = None
    type: Optional[ApplicationType] = ApplicationType.ALTERNANCE
    job_url: Optional[str] = None
    location: Optional[str] = None
    raw_description: Optional[str] = None
    is_flagged: Optional[bool] = False

class ApplicationCreate(ApplicationBase):
    pass

class ApplicationUpdate(ApplicationBase):
    company_id: Optional[UUID] = None

class ApplicationResponse(ApplicationBase):
    id: UUID
    user_id: UUID
    company: Optional[CompanyResponse] = None

    model_config = ConfigDict(from_attributes=True)
