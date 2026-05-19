import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import BigInteger, Column, DateTime, Enum, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class DocumentType(str, enum.Enum):
    CV = "CV"
    COVER_LETTER = "Lettre motivation"
    PORTFOLIO = "Portfolio"
    CERTIFICATE = "Certificat"
    OTHER = "Autre"


class Document(Base):
    __tablename__ = "documents"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    application_id = Column(UUID(as_uuid=True), ForeignKey("applications.id", ondelete="SET NULL"), nullable=True)
    original_filename = Column(String, nullable=False)
    stored_filename = Column(String, nullable=True)
    s3_key = Column(String, nullable=False, unique=True, index=True)
    file_url = Column(String, nullable=True)
    document_type = Column(Enum(DocumentType, native_enum=False), nullable=False)
    mime_type = Column(String, nullable=False)
    size = Column(BigInteger, nullable=False)
    display_name = Column(String, nullable=False)
    tags = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    user = relationship("User", back_populates="documents")
    application = relationship("Application", back_populates="documents", foreign_keys=[application_id])
