from typing import Optional
from pydantic import BaseModel, ConfigDict
from uuid import UUID
from app.models.document import DocumentType

class DocumentBase(BaseModel):
    application_id: UUID
    type: DocumentType
    version_name: str
    file_path: str

class DocumentCreate(DocumentBase):
    pass

class DocumentUpdate(DocumentBase):
    application_id: Optional[UUID] = None
    type: Optional[DocumentType] = None
    version_name: Optional[str] = None
    file_path: Optional[str] = None

class DocumentResponse(DocumentBase):
    id: UUID
    user_id: UUID

    model_config = ConfigDict(from_attributes=True)
