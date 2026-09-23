"""add semesters table

Revision ID: d7d9b3ae12a8
Revises: 89058a687885
Create Date: 2026-09-22 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd7d9b3ae12a8'
down_revision: Union[str, Sequence[str], None] = '89058a687885'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'semesters',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('start_date', sa.Date(), nullable=True),
        sa.Column('end_date', sa.Date(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_semesters_id'), 'semesters', ['id'], unique=False)
    op.create_index(op.f('ix_semesters_user_id'), 'semesters', ['user_id'], unique=False)

    op.add_column('courses', sa.Column('semester_id', sa.UUID(), nullable=True))
    op.create_index(op.f('ix_courses_semester_id'), 'courses', ['semester_id'], unique=False)
    op.create_foreign_key(
        'fk_courses_semester_id_semesters',
        'courses', 'semesters',
        ['semester_id'], ['id'],
        ondelete='SET NULL',
    )

    # Backfill: turn each distinct (user_id, semester) free-text value into a
    # Semester row, then point the originating courses at it.
    connection = op.get_bind()

    distinct_semesters = connection.execute(
        sa.text(
            "SELECT DISTINCT user_id, semester FROM courses "
            "WHERE semester IS NOT NULL AND semester <> ''"
        )
    ).fetchall()

    for user_id, semester_name in distinct_semesters:
        new_id = connection.execute(sa.text("SELECT gen_random_uuid()")).scalar()

        connection.execute(
            sa.text(
                "INSERT INTO semesters (id, user_id, name) "
                "VALUES (:id, :user_id, :name)"
            ),
            {"id": new_id, "user_id": user_id, "name": semester_name},
        )

        connection.execute(
            sa.text(
                "UPDATE courses SET semester_id = :semester_id "
                "WHERE user_id = :user_id AND semester = :name"
            ),
            {"semester_id": new_id, "user_id": user_id, "name": semester_name},
        )

    op.drop_column('courses', 'semester')


def downgrade() -> None:
    """Downgrade schema."""
    op.add_column('courses', sa.Column('semester', sa.String(length=100), nullable=True))

    connection = op.get_bind()
    connection.execute(
        sa.text(
            "UPDATE courses SET semester = semesters.name "
            "FROM semesters WHERE courses.semester_id = semesters.id"
        )
    )

    op.drop_constraint('fk_courses_semester_id_semesters', 'courses', type_='foreignkey')
    op.drop_index(op.f('ix_courses_semester_id'), table_name='courses')
    op.drop_column('courses', 'semester_id')

    op.drop_index(op.f('ix_semesters_user_id'), table_name='semesters')
    op.drop_index(op.f('ix_semesters_id'), table_name='semesters')
    op.drop_table('semesters')
