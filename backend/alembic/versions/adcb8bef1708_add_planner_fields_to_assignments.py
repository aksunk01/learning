"""add planner fields to assignments

Revision ID: adcb8bef1708
Revises: f3a1c9e4b2d7
Create Date: 2026-09-25 01:02:01.943913

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'adcb8bef1708'
down_revision: Union[str, Sequence[str], None] = 'f3a1c9e4b2d7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        "assignments",
        sa.Column("estimated_minutes", sa.Integer(), nullable=True),
    )
    op.add_column(
        "assignments",
        sa.Column("difficulty", sa.Integer(), nullable=True),
    )
    op.add_column(
        "assignments",
        sa.Column("scheduled_date", sa.Date(), nullable=True),
    )
    op.add_column(
        "assignments",
        sa.Column("priority_override", sa.Float(), nullable=True),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column("assignments", "priority_override")
    op.drop_column("assignments", "scheduled_date")
    op.drop_column("assignments", "difficulty")
    op.drop_column("assignments", "estimated_minutes")
