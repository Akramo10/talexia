from typing import Optional
from pydantic import BaseModel, ConfigDict
from uuid import UUID
from datetime import datetime
from app.models.application import ApplicationStatus, ApplicationType
from app.schemas.company import CompanyResponse
from app.schemas.document import DocumentResponse

class ApplicationBase(BaseModel):
    company_id: UUID
    date_sent: Optional[datetime] = None
    last_contact_date: Optional[datetime] = None
    status: Optional[ApplicationStatus] = ApplicationStatus.WISHLIST
    job_title: Optional[str] = None
    salary_proposed: Optional[str] = None
    type: Optional[ApplicationType] = ApplicationType.ALTERNANCE
    job_url: Optional[str] = None
    location: Optional[str] = None
    contract_type: Optional[str] = None
    remote_mode: Optional[str] = None
    publication_date: Optional[datetime] = None
    scraped_at: Optional[datetime] = None
    raw_description: Optional[str] = None
    is_flagged: Optional[bool] = False
    cv_document_id: Optional[UUID] = None
    cover_letter_document_id: Optional[UUID] = None

class ApplicationCreate(ApplicationBase):
    pass

class ApplicationUpdate(ApplicationBase):
    company_id: Optional[UUID] = None

class ApplicationResponse(ApplicationBase):
    id: UUID
    user_id: UUID
    company: Optional[CompanyResponse] = None
    cv_document: Optional[DocumentResponse] = None
    cover_letter_document: Optional[DocumentResponse] = None

    model_config = ConfigDict(from_attributes=True)
