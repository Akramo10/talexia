from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr

from app.models.email_campaign import CampaignLogLevel, CampaignStatus, RecipientStatus


class EmailCampaignBase(BaseModel):
    name: str
    subject: str
    body: str
    send_delay_seconds: int = 60


class EmailCampaignCreate(EmailCampaignBase):
    pass


class EmailCampaignUpdate(BaseModel):
    name: Optional[str] = None
    subject: Optional[str] = None
    body: Optional[str] = None
    status: Optional[CampaignStatus] = None
    send_delay_seconds: Optional[int] = None
    scheduled_at: Optional[datetime] = None


class EmailRecipientCreate(BaseModel):
    email: EmailStr
    company_name: Optional[str] = None
    contact_name: Optional[str] = None


class EmailRecipientUpdate(BaseModel):
    email: Optional[EmailStr] = None
    company_name: Optional[str] = None
    contact_name: Optional[str] = None
    status: Optional[RecipientStatus] = None
    error_message: Optional[str] = None


class BulkDeleteRecipientsRequest(BaseModel):
    recipient_ids: list[UUID]


class BulkCreateRecipientsRequest(BaseModel):
    raw_text: str


class BulkCreateRecipientsResponse(BaseModel):
    created_count: int
    duplicate_count: int
    invalid_count: int
    invalid_items: list[str]
    duplicate_items: list[str]


class EmailRecipientResponse(BaseModel):
    id: UUID
    campaign_id: UUID
    email: EmailStr
    company_name: Optional[str] = None
    contact_name: Optional[str] = None
    status: RecipientStatus
    sent_at: Optional[datetime] = None
    error_message: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class EmailAttachmentResponse(BaseModel):
    id: UUID
    campaign_id: UUID
    user_id: Optional[UUID] = None
    original_filename: Optional[str] = None
    s3_key: Optional[str] = None
    mime_type: Optional[str] = None
    size: Optional[int] = None
    file_name: str
    file_path: str
    content_type: Optional[str] = None
    size_bytes: Optional[int] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class EmailAttachmentDownloadResponse(BaseModel):
    url: str
    expires_in: int


class EmailCampaignResponse(EmailCampaignBase):
    id: UUID
    user_id: UUID
    status: CampaignStatus
    scheduled_at: Optional[datetime] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    cancelled_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    recipients: list[EmailRecipientResponse] = []
    attachments: list[EmailAttachmentResponse] = []
    total_recipients: int = 0
    sent_count: int = 0
    failed_count: int = 0
    pending_count: int = 0
    skipped_count: int = 0

    model_config = ConfigDict(from_attributes=True)


class ImportRecipientsResponse(BaseModel):
    imported: int
    invalid_rows: list[dict[str, str]]


class SendCampaignRequest(BaseModel):
    delay_seconds: Optional[int] = None
    scheduled_at: Optional[datetime] = None


class GmailStatusResponse(BaseModel):
    connected: bool
    connected_email: Optional[EmailStr] = None
    expires_at: Optional[datetime] = None
    scopes: list[str] = []


class CampaignLogResponse(BaseModel):
    id: UUID
    campaign_id: UUID
    level: CampaignLogLevel
    message: str
    recipient_id: Optional[UUID] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
