import enum
import uuid
from sqlalchemy import Column, String, Enum, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base

class DocumentType(str, enum.Enum):
    CV = "CV"
    LM = "LM"
    OTHER = "Other"

class Document(Base):
    __tablename__ = "documents"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    application_id = Column(UUID(as_uuid=True), ForeignKey("applications.id", ondelete="CASCADE"), nullable=False)
    type = Column(Enum(DocumentType, native_enum=False), nullable=False)
    version_name = Column(String, nullable=False)
    file_path = Column(String, nullable=False)

    user = relationship("User", back_populates="documents")
    application = relationship("Application", back_populates="documents")
