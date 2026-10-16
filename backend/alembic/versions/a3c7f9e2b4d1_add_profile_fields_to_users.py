"""add display_name and dashboard_layout to users

Revision ID: a3c7f9e2b4d1
Revises: 5040375ca299
Create Date: 2026-10-16 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a3c7f9e2b4d1'
down_revision: Union[str, Sequence[str], None] = '5040375ca299'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('users', sa.Column('display_name', sa.String(length=100), nullable=True))
    op.add_column(
        'users',
        sa.Column('dashboard_layout', sa.String(length=20), nullable=False, server_default='standard'),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('users', 'dashboard_layout')
    op.drop_column('users', 'display_name')
