"""make conversations.course_id nullable

Revision ID: c3e9a1f04d6b
Revises: b7e4d1a9c3f2
Create Date: 2026-10-16 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c3e9a1f04d6b'
down_revision: Union[str, Sequence[str], None] = 'b7e4d1a9c3f2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.drop_constraint('conversations_course_id_fkey', 'conversations', type_='foreignkey')
    op.alter_column('conversations', 'course_id', existing_type=sa.UUID(), nullable=True)
    op.create_foreign_key(
        'conversations_course_id_fkey',
        'conversations',
        'courses',
        ['course_id'],
        ['id'],
        ondelete='SET NULL',
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint('conversations_course_id_fkey', 'conversations', type_='foreignkey')
    op.alter_column('conversations', 'course_id', existing_type=sa.UUID(), nullable=False)
    op.create_foreign_key(
        'conversations_course_id_fkey',
        'conversations',
        'courses',
        ['course_id'],
        ['id'],
        ondelete='CASCADE',
    )
