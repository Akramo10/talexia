"""add campaign scheduled at

Revision ID: e3f4a5b6c7d8
Revises: d1e2f3a4b5c6
Create Date: 2026-05-19 16:20:00.000000
"""

from typing import Sequence, Union

from alembic import op


revision: str = "e3f4a5b6c7d8"
down_revision: Union[str, Sequence[str], None] = "d1e2f3a4b5c6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TABLE email_campaigns ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ;")
    op.execute("CREATE INDEX IF NOT EXISTS ix_email_campaigns_scheduled_at ON email_campaigns (scheduled_at);")


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_email_campaigns_scheduled_at;")
    op.execute("ALTER TABLE email_campaigns DROP COLUMN IF EXISTS scheduled_at;")
