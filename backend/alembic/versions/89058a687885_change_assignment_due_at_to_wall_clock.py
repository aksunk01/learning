"""change assignment due_at to wall clock

Revision ID: 89058a687885
Revises: a7995ae75538
Create Date: 2026-09-04 18:13:22.258876

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '89058a687885'
down_revision: Union[str, Sequence[str], None] = 'a7995ae75538'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    """Upgrade schema."""
    op.alter_column(
        "assignments",
        "due_at",
        existing_type=sa.DateTime(timezone=True),
        type_=sa.DateTime(timezone=False),
        existing_nullable=True,
        postgresql_using="due_at AT TIME ZONE 'America/New_York'",
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.alter_column(
        "assignments",
        "due_at",
        existing_type=sa.DateTime(timezone=False),
        type_=sa.DateTime(timezone=True),
        existing_nullable=True,
        postgresql_using="due_at AT TIME ZONE 'America/New_York'",
    )
