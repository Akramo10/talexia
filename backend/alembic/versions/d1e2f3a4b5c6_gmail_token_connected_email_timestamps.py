"""gmail token connected email timestamps

Revision ID: d1e2f3a4b5c6
Revises: c0d1e2f3a4b5
Create Date: 2026-05-19 15:00:00.000000
"""

from typing import Sequence, Union

from alembic import op


revision: str = "d1e2f3a4b5c6"
down_revision: Union[str, Sequence[str], None] = "c0d1e2f3a4b5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        ALTER TABLE gmail_tokens
            ADD COLUMN IF NOT EXISTS connected_email VARCHAR,
            ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now(),
            ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
        """
    )
    op.execute("UPDATE gmail_tokens SET created_at = now() WHERE created_at IS NULL;")
    op.execute("UPDATE gmail_tokens SET updated_at = now() WHERE updated_at IS NULL;")
    op.execute("ALTER TABLE gmail_tokens ALTER COLUMN created_at SET NOT NULL;")
    op.execute("ALTER TABLE gmail_tokens ALTER COLUMN updated_at SET NOT NULL;")


def downgrade() -> None:
    op.execute(
        """
        ALTER TABLE gmail_tokens
            DROP COLUMN IF EXISTS updated_at,
            DROP COLUMN IF EXISTS created_at,
            DROP COLUMN IF EXISTS connected_email;
        """
    )
