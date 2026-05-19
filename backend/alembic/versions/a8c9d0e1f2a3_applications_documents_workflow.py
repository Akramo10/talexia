"""applications documents s3 workflow

Revision ID: a8c9d0e1f2a3
Revises: f3a4b5c6d7e8
Create Date: 2026-05-15 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "a8c9d0e1f2a3"
down_revision: Union[str, Sequence[str], None] = "f3a4b5c6d7e8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("documents", sa.Column("application_id_tmp", postgresql.UUID(), nullable=True))
    op.execute("UPDATE documents SET application_id_tmp = application_id")
    op.drop_constraint("documents_application_id_fkey", "documents", type_="foreignkey")
    op.drop_column("documents", "application_id")
    op.alter_column("documents", "application_id_tmp", new_column_name="application_id")
    op.create_foreign_key(
        "documents_application_id_fkey",
        "documents",
        "applications",
        ["application_id"],
        ["id"],
        ondelete="SET NULL",
    )

    op.add_column("documents", sa.Column("original_filename", sa.String(), nullable=True))
    op.add_column("documents", sa.Column("stored_filename", sa.String(), nullable=True))
    op.add_column("documents", sa.Column("s3_key", sa.String(), nullable=True))
    op.add_column("documents", sa.Column("file_url", sa.String(), nullable=True))
    op.add_column("documents", sa.Column("document_type", sa.String(), nullable=True))
    op.add_column("documents", sa.Column("mime_type", sa.String(), nullable=True))
    op.add_column("documents", sa.Column("size", sa.BigInteger(), nullable=True))
    op.add_column("documents", sa.Column("display_name", sa.String(), nullable=True))
    op.add_column("documents", sa.Column("tags", sa.Text(), nullable=True))
    op.add_column("documents", sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False))
    op.add_column("documents", sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False))

    op.execute(
        """
        UPDATE documents
        SET
            original_filename = COALESCE(original_filename, split_part(file_path, '/', array_length(string_to_array(file_path, '/'), 1)), 'document'),
            stored_filename = COALESCE(split_part(file_path, '/', array_length(string_to_array(file_path, '/'), 1)), id::text),
            s3_key = 'legacy-local-import/' || id::text,
            document_type = CASE
                WHEN type::text IN ('CV', 'CV_GENERAL', 'CV_DATA', 'CV_BACKEND', 'CV_ALTERNANCE') THEN 'CV'
                WHEN type::text IN ('LM', 'COVER_LETTER') THEN 'Lettre motivation'
                ELSE 'Autre'
            END,
            mime_type = CASE
                WHEN lower(file_path) LIKE '%.docx' THEN 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
                ELSE 'application/pdf'
            END,
            size = 0,
            display_name = COALESCE(version_name, original_filename, 'Document')
        """
    )

    op.alter_column("documents", "original_filename", nullable=False)
    op.alter_column("documents", "s3_key", nullable=False)
    op.alter_column("documents", "document_type", nullable=False)
    op.alter_column("documents", "mime_type", nullable=False)
    op.alter_column("documents", "size", nullable=False)
    op.alter_column("documents", "display_name", nullable=False)
    op.create_index("ix_documents_s3_key", "documents", ["s3_key"], unique=True)
    op.drop_column("documents", "type")
    op.drop_column("documents", "version_name")
    op.drop_column("documents", "file_path")

    op.add_column("applications", sa.Column("job_title", sa.String(), nullable=True))
    op.add_column("applications", sa.Column("contract_type", sa.String(), nullable=True))
    op.add_column("applications", sa.Column("remote_mode", sa.String(), nullable=True))
    op.add_column("applications", sa.Column("publication_date", sa.DateTime(timezone=True), nullable=True))
    op.add_column("applications", sa.Column("scraped_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("applications", sa.Column("cv_document_id", postgresql.UUID(), nullable=True))
    op.add_column("applications", sa.Column("cover_letter_document_id", postgresql.UUID(), nullable=True))
    op.create_foreign_key(
        "applications_cv_document_id_fkey",
        "applications",
        "documents",
        ["cv_document_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_foreign_key(
        "applications_cover_letter_document_id_fkey",
        "applications",
        "documents",
        ["cover_letter_document_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint("applications_cover_letter_document_id_fkey", "applications", type_="foreignkey")
    op.drop_constraint("applications_cv_document_id_fkey", "applications", type_="foreignkey")
    op.drop_column("applications", "cover_letter_document_id")
    op.drop_column("applications", "cv_document_id")
    op.drop_column("applications", "scraped_at")
    op.drop_column("applications", "publication_date")
    op.drop_column("applications", "remote_mode")
    op.drop_column("applications", "contract_type")
    op.drop_column("applications", "job_title")

    op.add_column("documents", sa.Column("type", sa.String(), nullable=True))
    op.add_column("documents", sa.Column("version_name", sa.String(), nullable=True))
    op.add_column("documents", sa.Column("file_path", sa.String(), nullable=True))
    op.execute(
        """
        UPDATE documents
        SET
            type = CASE WHEN document_type = 'Lettre motivation' THEN 'LM' WHEN document_type = 'CV' THEN 'CV' ELSE 'Other' END,
            version_name = display_name,
            file_path = COALESCE(stored_filename, s3_key)
        """
    )
    op.alter_column("documents", "type", nullable=False)
    op.alter_column("documents", "version_name", nullable=False)
    op.alter_column("documents", "file_path", nullable=False)
    op.drop_index("ix_documents_s3_key", table_name="documents")
    op.drop_column("documents", "updated_at")
    op.drop_column("documents", "created_at")
    op.drop_column("documents", "tags")
    op.drop_column("documents", "display_name")
    op.drop_column("documents", "size")
    op.drop_column("documents", "mime_type")
    op.drop_column("documents", "document_type")
    op.drop_column("documents", "file_url")
    op.drop_column("documents", "s3_key")
    op.drop_column("documents", "stored_filename")
    op.drop_column("documents", "original_filename")

    op.drop_constraint("documents_application_id_fkey", "documents", type_="foreignkey")
    op.drop_column("documents", "application_id")
    op.add_column("documents", sa.Column("application_id", postgresql.UUID(), nullable=False))
    op.create_foreign_key(
        "documents_application_id_fkey",
        "documents",
        "applications",
        ["application_id"],
        ["id"],
        ondelete="CASCADE",
    )
