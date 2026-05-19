"""campaign attachments s3 metadata

Revision ID: c0d1e2f3a4b5
Revises: b9d0e1f2a3b4
Create Date: 2026-05-19 12:00:00.000000
"""

from typing import Sequence, Union

from alembic import op


revision: str = "c0d1e2f3a4b5"
down_revision: Union[str, Sequence[str], None] = "b9d0e1f2a3b4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        ALTER TABLE email_attachments
            ADD COLUMN IF NOT EXISTS user_id UUID,
            ADD COLUMN IF NOT EXISTS original_filename VARCHAR,
            ADD COLUMN IF NOT EXISTS s3_key VARCHAR,
            ADD COLUMN IF NOT EXISTS mime_type VARCHAR,
            ADD COLUMN IF NOT EXISTS size INTEGER;
        """
    )
    op.execute(
        """
        UPDATE email_attachments ea
        SET
            user_id = COALESCE(ea.user_id, ec.user_id),
            original_filename = COALESCE(ea.original_filename, ea.file_name),
            s3_key = COALESCE(ea.s3_key, ea.file_path),
            mime_type = COALESCE(ea.mime_type, ea.content_type),
            size = COALESCE(ea.size, ea.size_bytes)
        FROM email_campaigns ec
        WHERE ea.campaign_id = ec.id;
        """
    )
    op.execute("CREATE INDEX IF NOT EXISTS ix_email_attachments_user_id ON email_attachments (user_id);")
    op.execute("CREATE INDEX IF NOT EXISTS ix_email_attachments_s3_key ON email_attachments (s3_key);")
    op.execute(
        """
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1
                FROM pg_constraint
                WHERE conname = 'fk_email_attachments_user_id_users'
            ) THEN
                ALTER TABLE email_attachments
                    ADD CONSTRAINT fk_email_attachments_user_id_users
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
            END IF;
        END $$;
        """
    )


def downgrade() -> None:
    op.execute("ALTER TABLE email_attachments DROP CONSTRAINT IF EXISTS fk_email_attachments_user_id_users;")
    op.execute("DROP INDEX IF EXISTS ix_email_attachments_s3_key;")
    op.execute("DROP INDEX IF EXISTS ix_email_attachments_user_id;")
    op.execute(
        """
        ALTER TABLE email_attachments
            DROP COLUMN IF EXISTS size,
            DROP COLUMN IF EXISTS mime_type,
            DROP COLUMN IF EXISTS s3_key,
            DROP COLUMN IF EXISTS original_filename,
            DROP COLUMN IF EXISTS user_id;
        """
    )
