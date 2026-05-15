import uuid
from sqlalchemy import Column, ForeignKey, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from sqlalchemy.orm import relationship
from app.database import Base

class Company(Base):
    __tablename__ = "companies"
    __table_args__ = (UniqueConstraint("user_id", "name", name="uq_companies_user_name"),)

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String, index=True, nullable=False)
    sector = Column(String, nullable=True)
    tech_stack = Column(ARRAY(String), nullable=True)
    glassdoor_link = Column(String, nullable=True)
    linkedin_link = Column(String, nullable=True)

    user = relationship("User", back_populates="companies")
    applications = relationship("Application", back_populates="company", cascade="all, delete-orphan")
