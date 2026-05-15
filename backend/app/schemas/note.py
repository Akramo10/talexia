from typing import Optional
from pydantic import BaseModel, ConfigDict
from uuid import UUID
from datetime import datetime

class NoteBase(BaseModel):
    application_id: UUID
    content: str

class NoteCreate(NoteBase):
    pass

class NoteUpdate(NoteBase):
    application_id: Optional[UUID] = None
    content: Optional[str] = None

class NoteResponse(NoteBase):
    id: UUID
    user_id: UUID
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
