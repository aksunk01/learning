"""add assignment completion fields

Revision ID: d149eeeeaefb
Revises: 3ea788afb58d
Create Date: 2026-08-22 22:23:19.009792

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd149eeeeaefb'
down_revision: Union[str, Sequence[str], None] = '3ea788afb58d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
