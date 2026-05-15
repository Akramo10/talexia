"""upgrade campaign crm

Revision ID: f3a4b5c6d7e8
Revises: e2f3a4b5c6d7
Create Date: 2026-05-14 18:40:00.000000
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "f3a4b5c6d7e8"
down_revision: Union[str, None] = "e2f3a4b5c6d7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column("email_campaigns", "status", type_=sa.String(length=20), existing_type=sa.String(length=7))
    op.add_column("email_campaigns", sa.Column("send_delay_seconds", sa.Integer(), nullable=True))
    op.add_column("email_campaigns", sa.Column("started_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("email_campaigns", sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("email_campaigns", sa.Column("cancelled_at", sa.DateTime(timezone=True), nullable=True))
    op.execute("UPDATE email_campaigns SET send_delay_seconds = 60 WHERE send_delay_seconds IS NULL")
    op.execute("UPDATE email_campaigns SET status = 'COMPLETED' WHERE status = 'SENT'")
    op.execute("UPDATE email_campaigns SET status = 'DRAFT' WHERE status = 'PENDING'")
    op.alter_column("email_campaigns", "send_delay_seconds", nullable=False)

    op.create_table(
        "campaign_logs",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("campaign_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("level", sa.Enum("INFO", "SUCCESS", "ERROR", "WARNING", name="campaignloglevel", native_enum=False), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("recipient_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["campaign_id"], ["email_campaigns.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["recipient_id"], ["email_recipients.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_campaign_logs_campaign_id"), "campaign_logs", ["campaign_id"], unique=False)
    op.create_index(op.f("ix_campaign_logs_created_at"), "campaign_logs", ["created_at"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_campaign_logs_created_at"), table_name="campaign_logs")
    op.drop_index(op.f("ix_campaign_logs_campaign_id"), table_name="campaign_logs")
    op.drop_table("campaign_logs")
    op.drop_column("email_campaigns", "cancelled_at")
    op.drop_column("email_campaigns", "completed_at")
    op.drop_column("email_campaigns", "started_at")
    op.drop_column("email_campaigns", "send_delay_seconds")
    op.alter_column("email_campaigns", "status", type_=sa.String(length=7), existing_type=sa.String(length=20))
