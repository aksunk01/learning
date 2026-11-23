"""replace assignment difficulty with effort

Revision ID: f4a8c2d6e9b3
Revises: a1b2c3d4e5f6
Create Date: 2026-10-21 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f4a8c2d6e9b3'
down_revision: Union[str, Sequence[str], None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        "assignments",
        sa.Column("effort", sa.String(length=10), nullable=True),
    )
    op.drop_column("assignments", "difficulty")


def downgrade() -> None:
    """Downgrade schema."""
    op.add_column(
        "assignments",
        sa.Column("difficulty", sa.Integer(), nullable=True),
    )
    op.drop_column("assignments", "effort")
