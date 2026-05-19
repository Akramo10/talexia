import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, Enum, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class CampaignStatus(str, enum.Enum):
    DRAFT = "draft"
    SCHEDULED = "scheduled"
    SENDING = "sending"
    PAUSED = "paused"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class RecipientStatus(str, enum.Enum):
    PENDING = "pending"
    SENT = "sent"
    FAILED = "failed"
    SKIPPED = "skipped"


class CampaignLogLevel(str, enum.Enum):
    INFO = "info"
    SUCCESS = "success"
    ERROR = "error"
    WARNING = "warning"


class EmailCampaign(Base):
    __tablename__ = "email_campaigns"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String, nullable=False)
    subject = Column(String, nullable=False)
    body = Column(Text, nullable=False)
    status = Column(Enum(CampaignStatus, native_enum=False), default=CampaignStatus.DRAFT, nullable=False)
    send_delay_seconds = Column(Integer, default=60, nullable=False)
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    cancelled_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    user = relationship("User", back_populates="email_campaigns")
    recipients = relationship("EmailRecipient", back_populates="campaign", cascade="all, delete-orphan")
    attachments = relationship("EmailAttachment", back_populates="campaign", cascade="all, delete-orphan")
    logs = relationship("CampaignLog", back_populates="campaign", cascade="all, delete-orphan")


class EmailRecipient(Base):
    __tablename__ = "email_recipients"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    campaign_id = Column(UUID(as_uuid=True), ForeignKey("email_campaigns.id", ondelete="CASCADE"), nullable=False, index=True)
    email = Column(String, nullable=False, index=True)
    company_name = Column(String, nullable=True)
    contact_name = Column(String, nullable=True)
    status = Column(Enum(RecipientStatus, native_enum=False), default=RecipientStatus.PENDING, nullable=False)
    sent_at = Column(DateTime(timezone=True), nullable=True)
    error_message = Column(Text, nullable=True)

    campaign = relationship("EmailCampaign", back_populates="recipients")


class EmailAttachment(Base):
    __tablename__ = "email_attachments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    campaign_id = Column(UUID(as_uuid=True), ForeignKey("email_campaigns.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)
    original_filename = Column(String, nullable=True)
    s3_key = Column(String, nullable=True)
    mime_type = Column(String, nullable=True)
    size = Column(Integer, nullable=True)
    file_name = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    content_type = Column(String, nullable=True)
    size_bytes = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    campaign = relationship("EmailCampaign", back_populates="attachments")


class CampaignLog(Base):
    __tablename__ = "campaign_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    campaign_id = Column(UUID(as_uuid=True), ForeignKey("email_campaigns.id", ondelete="CASCADE"), nullable=False, index=True)
    level = Column(Enum(CampaignLogLevel, native_enum=False), default=CampaignLogLevel.INFO, nullable=False)
    message = Column(Text, nullable=False)
    recipient_id = Column(UUID(as_uuid=True), ForeignKey("email_recipients.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False, index=True)

    campaign = relationship("EmailCampaign", back_populates="logs")
    recipient = relationship("EmailRecipient")


class GmailToken(Base):
    __tablename__ = "gmail_tokens"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    access_token = Column(Text, nullable=False)
    refresh_token = Column(Text, nullable=True)
    token_uri = Column(String, nullable=False)
    client_id = Column(String, nullable=False)
    client_secret = Column(Text, nullable=False)
    scopes = Column(Text, nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=True)
    connected_email = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    user = relationship("User", back_populates="gmail_token")
