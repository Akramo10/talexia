from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from app.models.document import DocumentType


class DocumentBase(BaseModel):
    application_id: Optional[UUID] = None
    original_filename: str
    stored_filename: Optional[str] = None
    s3_key: str
    file_url: Optional[str] = None
    document_type: DocumentType
    mime_type: str
    size: int
    display_name: str
    tags: Optional[str] = None


class DocumentUpdate(BaseModel):
    display_name: Optional[str] = None
    document_type: Optional[DocumentType] = None
    tags: Optional[str] = None
    application_id: Optional[UUID] = None


class DocumentResponse(DocumentBase):
    id: UUID
    user_id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class DocumentDownloadResponse(BaseModel):
    url: str
    expires_in: int
