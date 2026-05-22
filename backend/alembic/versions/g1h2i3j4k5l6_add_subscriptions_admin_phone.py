"""add subscriptions admin phone

Revision ID: g1h2i3j4k5l6
Revises: a1b2c3d4e5f6
Create Date: 2026-05-22 11:30:00.000000
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "g1h2i3j4k5l6"
down_revision: Union[str, Sequence[str], None] = "a1b2c3d4e5f6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("phone", sa.String(), nullable=True))
    op.add_column("users", sa.Column("is_admin", sa.Boolean(), nullable=False, server_default=sa.false()))

    op.create_table(
        "subscription_plans",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("duration_months", sa.Integer(), nullable=False),
        sa.Column("price_eur", sa.Numeric(10, 2), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name"),
    )
    op.create_table(
        "user_subscriptions",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("plan_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("status", sa.Enum("TRIAL", "ACTIVE", "EXPIRED", "CANCELLED", name="subscriptionstatus", native_enum=False), nullable=False),
        sa.Column("starts_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("ends_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["plan_id"], ["subscription_plans.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_user_subscriptions_user_id"), "user_subscriptions", ["user_id"], unique=False)
    op.create_index(op.f("ix_user_subscriptions_status"), "user_subscriptions", ["status"], unique=False)
    op.create_index(op.f("ix_user_subscriptions_ends_at"), "user_subscriptions", ["ends_at"], unique=False)

    op.create_table(
        "subscription_reminder_logs",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_subscription_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "reminder_type",
            sa.Enum(
                "TRIAL_D15",
                "TRIAL_D5",
                "TRIAL_D1",
                "SUBSCRIPTION_D15",
                "SUBSCRIPTION_D5",
                "SUBSCRIPTION_D1",
                "EXPIRED",
                name="remindertype",
                native_enum=False,
            ),
            nullable=False,
        ),
        sa.Column("sent_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["user_subscription_id"], ["user_subscriptions.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_subscription_id", "reminder_type", name="uq_subscription_reminder_once"),
    )
    op.create_index(op.f("ix_subscription_reminder_logs_user_subscription_id"), "subscription_reminder_logs", ["user_subscription_id"], unique=False)

    op.execute(
        """
        INSERT INTO subscription_plans (id, name, duration_months, price_eur, is_active)
        VALUES
          ('11111111-1111-4111-8111-111111111111', 'Trial gratuit', 3, 0.00, true),
          ('22222222-2222-4222-8222-222222222222', 'Plan 6 mois', 6, 30.00, true),
          ('33333333-3333-4333-8333-333333333333', 'Plan 12 mois', 12, 50.00, true)
        ON CONFLICT (name) DO NOTHING
        """
    )
    op.execute("UPDATE subscription_plans SET price_eur = 30.00, duration_months = 6, is_active = true WHERE name = 'Plan 6 mois'")
    op.execute("UPDATE subscription_plans SET price_eur = 50.00, duration_months = 12, is_active = true WHERE name = 'Plan 12 mois'")


def downgrade() -> None:
    op.drop_index(op.f("ix_subscription_reminder_logs_user_subscription_id"), table_name="subscription_reminder_logs")
    op.drop_table("subscription_reminder_logs")
    op.drop_index(op.f("ix_user_subscriptions_ends_at"), table_name="user_subscriptions")
    op.drop_index(op.f("ix_user_subscriptions_status"), table_name="user_subscriptions")
    op.drop_index(op.f("ix_user_subscriptions_user_id"), table_name="user_subscriptions")
    op.drop_table("user_subscriptions")
    op.drop_table("subscription_plans")
    op.drop_column("users", "is_admin")
    op.drop_column("users", "phone")
