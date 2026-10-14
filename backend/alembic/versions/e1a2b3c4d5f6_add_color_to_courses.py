"""add color to courses

Revision ID: e1a2b3c4d5f6
Revises: c88e150cc555
Create Date: 2026-10-14 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e1a2b3c4d5f6'
down_revision: Union[str, Sequence[str], None] = 'c88e150cc555'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        "courses",
        sa.Column("color", sa.String(length=7), nullable=False, server_default="#3b82f6"),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column("courses", "color")
