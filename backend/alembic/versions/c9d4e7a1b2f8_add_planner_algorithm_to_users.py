"""add planner_algorithm to users

Revision ID: c9d4e7a1b2f8
Revises: f4a8c2d6e9b3
Create Date: 2026-11-22 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c9d4e7a1b2f8'
down_revision: Union[str, Sequence[str], None] = 'f4a8c2d6e9b3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('users', sa.Column('planner_algorithm', sa.String(length=20), server_default='balanced', nullable=False))


def downgrade() -> None:
    op.drop_column('users', 'planner_algorithm')
