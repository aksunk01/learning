"""add assignment completion fields

Revision ID: d149eeeeaefb
Revises: 3ea788afb58d
Create Date: 2026-08-22 22:23:19.009792

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "d149eeeeaefb"
down_revision: Union[str, Sequence[str], None] = "3ea788afb58d"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        "assignments",
        sa.Column(
            "is_completed",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
    )

    op.add_column(
        "assignments",
        sa.Column(
            "completed_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column("assignments", "completed_at")
    op.drop_column("assignments", "is_completed")