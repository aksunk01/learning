"""add favorite_semester_id to users

Revision ID: b7e4d1a9c3f2
Revises: a3c7f9e2b4d1
Create Date: 2026-10-16 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'b7e4d1a9c3f2'
down_revision: Union[str, Sequence[str], None] = 'a3c7f9e2b4d1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('users', sa.Column('favorite_semester_id', postgresql.UUID(as_uuid=True), nullable=True))
    op.create_foreign_key(
        'users_favorite_semester_id_fkey',
        'users',
        'semesters',
        ['favorite_semester_id'],
        ['id'],
        ondelete='SET NULL',
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint('users_favorite_semester_id_fkey', 'users', type_='foreignkey')
    op.drop_column('users', 'favorite_semester_id')
