"""add auth and email campaigns

Revision ID: e2f3a4b5c6d7
Revises: d7e8f9a0b1c2
Create Date: 2026-05-14 15:30:00.000000
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql
from uuid import uuid4

revision: str = "e2f3a4b5c6d7"
down_revision: Union[str, None] = "d7e8f9a0b1c2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("email", sa.String(), nullable=False),
        sa.Column("full_name", sa.String(), nullable=True),
        sa.Column("hashed_password", sa.String(), nullable=True),
        sa.Column("google_id", sa.String(), nullable=True),
        sa.Column("avatar_url", sa.String(), nullable=True),
        sa.Column("auth_provider", sa.Enum("LOCAL", "GOOGLE", name="authprovider", native_enum=False), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_users_email"), "users", ["email"], unique=True)
    op.create_unique_constraint("uq_users_google_id", "users", ["google_id"])

    for table_name in ("companies", "applications", "documents", "notes"):
        op.add_column(table_name, sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=True))

    bind = op.get_bind()
    legacy_user_id = uuid4()
    bind.execute(
        sa.text(
            """
            INSERT INTO users (id, email, full_name, auth_provider, is_active, created_at)
            VALUES (:id, 'legacy-user@example.local', 'Legacy User', 'LOCAL', true, now())
            """
        ),
        {"id": legacy_user_id},
    )

    for table_name in ("companies", "applications", "documents", "notes"):
        bind.execute(sa.text(f"UPDATE {table_name} SET user_id = :user_id WHERE user_id IS NULL"), {"user_id": legacy_user_id})
        op.alter_column(table_name, "user_id", nullable=False)
        op.create_index(op.f(f"ix_{table_name}_user_id"), table_name, ["user_id"], unique=False)
        op.create_foreign_key(f"fk_{table_name}_user_id_users", table_name, "users", ["user_id"], ["id"], ondelete="CASCADE")

    op.drop_index(op.f("ix_companies_name"), table_name="companies")
    op.create_index(op.f("ix_companies_name"), "companies", ["name"], unique=False)
    op.create_unique_constraint("uq_companies_user_name", "companies", ["user_id", "name"])

    op.create_table(
        "email_campaigns",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("subject", sa.String(), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("status", sa.Enum("DRAFT", "PENDING", "SENDING", "SENT", "FAILED", name="campaignstatus", native_enum=False), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_email_campaigns_user_id"), "email_campaigns", ["user_id"], unique=False)

    op.create_table(
        "email_recipients",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("campaign_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("email", sa.String(), nullable=False),
        sa.Column("company_name", sa.String(), nullable=True),
        sa.Column("contact_name", sa.String(), nullable=True),
        sa.Column("status", sa.Enum("PENDING", "SENT", "FAILED", name="recipientstatus", native_enum=False), nullable=False),
        sa.Column("sent_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(["campaign_id"], ["email_campaigns.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_email_recipients_campaign_id"), "email_recipients", ["campaign_id"], unique=False)
    op.create_index(op.f("ix_email_recipients_email"), "email_recipients", ["email"], unique=False)

    op.create_table(
        "email_attachments",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("campaign_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("file_name", sa.String(), nullable=False),
        sa.Column("file_path", sa.String(), nullable=False),
        sa.Column("content_type", sa.String(), nullable=True),
        sa.Column("size_bytes", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["campaign_id"], ["email_campaigns.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_email_attachments_campaign_id"), "email_attachments", ["campaign_id"], unique=False)

    op.create_table(
        "gmail_tokens",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("access_token", sa.Text(), nullable=False),
        sa.Column("refresh_token", sa.Text(), nullable=True),
        sa.Column("token_uri", sa.String(), nullable=False),
        sa.Column("client_id", sa.String(), nullable=False),
        sa.Column("client_secret", sa.Text(), nullable=False),
        sa.Column("scopes", sa.Text(), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id"),
    )
    op.create_index(op.f("ix_gmail_tokens_user_id"), "gmail_tokens", ["user_id"], unique=True)


def downgrade() -> None:
    op.drop_index(op.f("ix_gmail_tokens_user_id"), table_name="gmail_tokens")
    op.drop_table("gmail_tokens")
    op.drop_index(op.f("ix_email_attachments_campaign_id"), table_name="email_attachments")
    op.drop_table("email_attachments")
    op.drop_index(op.f("ix_email_recipients_email"), table_name="email_recipients")
    op.drop_index(op.f("ix_email_recipients_campaign_id"), table_name="email_recipients")
    op.drop_table("email_recipients")
    op.drop_index(op.f("ix_email_campaigns_user_id"), table_name="email_campaigns")
    op.drop_table("email_campaigns")

    op.drop_constraint("uq_companies_user_name", "companies", type_="unique")
    op.drop_index(op.f("ix_companies_name"), table_name="companies")
    op.create_index(op.f("ix_companies_name"), "companies", ["name"], unique=True)

    for table_name in ("notes", "documents", "applications", "companies"):
        op.drop_constraint(f"fk_{table_name}_user_id_users", table_name, type_="foreignkey")
        op.drop_index(op.f(f"ix_{table_name}_user_id"), table_name=table_name)
        op.drop_column(table_name, "user_id")

    op.drop_constraint("uq_users_google_id", "users", type_="unique")
    op.drop_index(op.f("ix_users_email"), table_name="users")
    op.drop_table("users")
