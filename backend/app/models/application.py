import enum
import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, Enum, ForeignKey, Text, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base

class ApplicationStatus(str, enum.Enum):
    WISHLIST = "Wishlist"
    APPLIED = "Applied"
    FOLLOW_UP = "Follow-up"
    INTERVIEW = "Interview"
    TECHNICAL_TEST = "Technical Test"
    REJECTED = "Rejected"
    OFFER = "Offer"

class ApplicationType(str, enum.Enum):
    STAGE = "Stage"
    ALTERNANCE = "Alternance"
    CDI = "CDI"
    CDD = "CDD"
    FREELANCE = "Freelance"
    PART_TIME = "Temps partiel"
    FULL_TIME = "Temps plein"
    INTERIM = "Interim"

class Application(Base):
    __tablename__ = "applications"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    company_id = Column(UUID(as_uuid=True), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    date_sent = Column(DateTime(timezone=True), nullable=True, default=None)
    last_contact_date = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    status = Column(Enum(ApplicationStatus, native_enum=False), default=ApplicationStatus.WISHLIST)
    job_title = Column(String, nullable=True)
    salary_proposed = Column(String, nullable=True)
    type = Column(Enum(ApplicationType, native_enum=False), default=ApplicationType.ALTERNANCE)
    job_url = Column(String, nullable=True)
    location = Column(String, nullable=True)
    contract_type = Column(String, nullable=True)
    remote_mode = Column(String, nullable=True)
    publication_date = Column(DateTime(timezone=True), nullable=True)
    scraped_at = Column(DateTime(timezone=True), nullable=True)
    raw_description = Column(Text, nullable=True)
    is_flagged = Column(Boolean, default=False)
    cv_document_id = Column(UUID(as_uuid=True), ForeignKey("documents.id", ondelete="SET NULL"), nullable=True)
    cover_letter_document_id = Column(UUID(as_uuid=True), ForeignKey("documents.id", ondelete="SET NULL"), nullable=True)

    user = relationship("User", back_populates="applications")
    company = relationship("Company", back_populates="applications")
    documents = relationship(
        "Document",
        back_populates="application",
        cascade="all, delete-orphan",
        foreign_keys="Document.application_id",
    )
    cv_document = relationship("Document", foreign_keys=[cv_document_id], post_update=True)
    cover_letter_document = relationship("Document", foreign_keys=[cover_letter_document_id], post_update=True)
    notes = relationship("Note", back_populates="application", cascade="all, delete-orphan")
