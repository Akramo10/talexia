"""add application location

Revision ID: c1a2b3d4e5f6
Revises: 7b9aa0e8edb3
Create Date: 2026-05-14 01:58:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'c1a2b3d4e5f6'
down_revision: Union[str, Sequence[str], None] = '7b9aa0e8edb3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('applications', sa.Column('location', sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column('applications', 'location')
