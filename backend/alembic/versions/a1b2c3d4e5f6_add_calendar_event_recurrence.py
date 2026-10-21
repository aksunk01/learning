"""add calendar event recurrence

Revision ID: a1b2c3d4e5f6
Revises: 1e1c1dd2f887
Create Date: 2026-10-21 23:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = '1e1c1dd2f887'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('calendar_events', sa.Column('recurrence_frequency', sa.String(length=10), nullable=True))
    op.add_column('calendar_events', sa.Column('recurrence_interval', sa.Integer(), server_default='1', nullable=False))
    op.add_column('calendar_events', sa.Column('recurrence_days_of_week', postgresql.JSONB(astext_type=sa.Text()), nullable=True))
    op.add_column('calendar_events', sa.Column('recurrence_end_date', sa.Date(), nullable=True))

    op.create_table(
        'calendar_event_overrides',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('event_id', sa.UUID(), nullable=False),
        sa.Column('occurrence_date', sa.Date(), nullable=False),
        sa.Column('is_cancelled', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('title', sa.String(length=255), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('location', sa.String(length=255), nullable=True),
        sa.Column('start_at', sa.DateTime(), nullable=True),
        sa.Column('end_at', sa.DateTime(), nullable=True),
        sa.Column('all_day', sa.Boolean(), nullable=True),
        sa.Column('color', sa.String(length=7), nullable=True),
        sa.Column('course_id', sa.UUID(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default='now()', nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default='now()', nullable=False),
        sa.ForeignKeyConstraint(['course_id'], ['courses.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['event_id'], ['calendar_events.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('event_id', 'occurrence_date', name='uq_calendar_event_override_occurrence'),
    )
    op.create_index(op.f('ix_calendar_event_overrides_event_id'), 'calendar_event_overrides', ['event_id'], unique=False)
    op.create_index(op.f('ix_calendar_event_overrides_occurrence_date'), 'calendar_event_overrides', ['occurrence_date'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_calendar_event_overrides_occurrence_date'), table_name='calendar_event_overrides')
    op.drop_index(op.f('ix_calendar_event_overrides_event_id'), table_name='calendar_event_overrides')
    op.drop_table('calendar_event_overrides')
    op.drop_column('calendar_events', 'recurrence_end_date')
    op.drop_column('calendar_events', 'recurrence_days_of_week')
    op.drop_column('calendar_events', 'recurrence_interval')
    op.drop_column('calendar_events', 'recurrence_frequency')
