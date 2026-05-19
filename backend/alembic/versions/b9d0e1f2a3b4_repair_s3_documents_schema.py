"""repair s3 documents schema

Revision ID: b9d0e1f2a3b4
Revises: a8c9d0e1f2a3
Create Date: 2026-05-15 17:40:00.000000

"""
from typing import Sequence, Union

from alembic import op


revision: str = "b9d0e1f2a3b4"
down_revision: Union[str, Sequence[str], None] = "a8c9d0e1f2a3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        ALTER TABLE documents
            ADD COLUMN IF NOT EXISTS stored_filename VARCHAR,
            ADD COLUMN IF NOT EXISTS s3_key VARCHAR,
            ADD COLUMN IF NOT EXISTS file_url VARCHAR,
            ADD COLUMN IF NOT EXISTS document_type VARCHAR,
            ADD COLUMN IF NOT EXISTS mime_type VARCHAR,
            ADD COLUMN IF NOT EXISTS size BIGINT,
            ADD COLUMN IF NOT EXISTS display_name VARCHAR,
            ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now(),
            ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
        """
    )
    op.execute(
        """
        UPDATE documents
        SET
            original_filename = COALESCE(original_filename, regexp_replace(file_path, '^.*[\\\\/]', ''), 'document'),
            stored_filename = COALESCE(stored_filename, regexp_replace(file_path, '^.*[\\\\/]', ''), id::text),
            s3_key = COALESCE(s3_key, 'legacy-local-import/' || id::text),
            document_type = COALESCE(
                document_type,
                CASE
                    WHEN type::text IN ('CV', 'CV_GENERAL', 'CV_DATA', 'CV_BACKEND', 'CV_ALTERNANCE') THEN 'CV'
                    WHEN type::text IN ('LM', 'COVER_LETTER') THEN 'Lettre motivation'
                    ELSE 'Autre'
                END
            ),
            mime_type = COALESCE(
                mime_type,
                CASE
                    WHEN lower(file_path) LIKE '%.docx' THEN 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
                    ELSE 'application/pdf'
                END
            ),
            size = COALESCE(size, 0),
            display_name = COALESCE(display_name, version_name, original_filename, 'Document'),
            created_at = COALESCE(created_at, uploaded_at, now()),
            updated_at = COALESCE(updated_at, uploaded_at, now());
        """
    )
    op.execute("ALTER TABLE documents ALTER COLUMN original_filename SET NOT NULL;")
    op.execute("ALTER TABLE documents ALTER COLUMN s3_key SET NOT NULL;")
    op.execute("ALTER TABLE documents ALTER COLUMN document_type SET NOT NULL;")
    op.execute("ALTER TABLE documents ALTER COLUMN mime_type SET NOT NULL;")
    op.execute("ALTER TABLE documents ALTER COLUMN size SET NOT NULL;")
    op.execute("ALTER TABLE documents ALTER COLUMN display_name SET NOT NULL;")
    op.execute("ALTER TABLE documents ALTER COLUMN created_at SET NOT NULL;")
    op.execute("ALTER TABLE documents ALTER COLUMN updated_at SET NOT NULL;")
    op.execute("CREATE UNIQUE INDEX IF NOT EXISTS ix_documents_s3_key ON documents (s3_key);")
    op.execute("ALTER TABLE documents DROP COLUMN IF EXISTS type;")
    op.execute("ALTER TABLE documents DROP COLUMN IF EXISTS version_name;")
    op.execute("ALTER TABLE documents DROP COLUMN IF EXISTS file_path;")
    op.execute("ALTER TABLE documents DROP COLUMN IF EXISTS uploaded_at;")

    op.execute(
        """
        ALTER TABLE applications
            ADD COLUMN IF NOT EXISTS job_title VARCHAR,
            ADD COLUMN IF NOT EXISTS contract_type VARCHAR,
            ADD COLUMN IF NOT EXISTS remote_mode VARCHAR,
            ADD COLUMN IF NOT EXISTS publication_date TIMESTAMPTZ,
            ADD COLUMN IF NOT EXISTS scraped_at TIMESTAMPTZ,
            ADD COLUMN IF NOT EXISTS cv_document_id UUID,
            ADD COLUMN IF NOT EXISTS cover_letter_document_id UUID;
        """
    )
    op.execute(
        """
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_constraint WHERE conname = 'applications_cv_document_id_fkey'
            ) THEN
                ALTER TABLE applications
                ADD CONSTRAINT applications_cv_document_id_fkey
                FOREIGN KEY (cv_document_id) REFERENCES documents(id) ON DELETE SET NULL;
            END IF;
            IF NOT EXISTS (
                SELECT 1 FROM pg_constraint WHERE conname = 'applications_cover_letter_document_id_fkey'
            ) THEN
                ALTER TABLE applications
                ADD CONSTRAINT applications_cover_letter_document_id_fkey
                FOREIGN KEY (cover_letter_document_id) REFERENCES documents(id) ON DELETE SET NULL;
            END IF;
        END $$;
        """
    )


def downgrade() -> None:
    op.execute("ALTER TABLE applications DROP CONSTRAINT IF EXISTS applications_cover_letter_document_id_fkey;")
    op.execute("ALTER TABLE applications DROP CONSTRAINT IF EXISTS applications_cv_document_id_fkey;")
    op.execute("DROP INDEX IF EXISTS ix_documents_s3_key;")
