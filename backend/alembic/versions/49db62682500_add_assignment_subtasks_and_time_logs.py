"""add assignment subtasks and time logs

Revision ID: 49db62682500
Revises: adcb8bef1708
Create Date: 2026-09-25 01:02:06.828190

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = '49db62682500'
down_revision: Union[str, Sequence[str], None] = 'adcb8bef1708'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        "assignment_subtasks",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "assignment_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("assignments.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("estimated_minutes", sa.Integer(), nullable=False),
        sa.Column(
            "order_index", sa.Integer(), nullable=False, server_default="0"
        ),
        sa.Column("scheduled_date", sa.Date(), nullable=True),
        sa.Column(
            "is_completed",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "source",
            sa.String(length=20),
            nullable=False,
            server_default="manual",
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )
    op.create_index(
        "ix_assignment_subtasks_id", "assignment_subtasks", ["id"]
    )
    op.create_index(
        "ix_assignment_subtasks_assignment_id",
        "assignment_subtasks",
        ["assignment_id"],
    )

    op.create_table(
        "task_time_logs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "assignment_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("assignments.id", ondelete="CASCADE"),
            nullable=True,
        ),
        sa.Column(
            "subtask_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("assignment_subtasks.id", ondelete="CASCADE"),
            nullable=True,
        ),
        sa.Column(
            "course_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("courses.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("assignment_type", sa.String(length=50), nullable=True),
        sa.Column("estimated_minutes", sa.Integer(), nullable=True),
        sa.Column("actual_minutes", sa.Integer(), nullable=False),
        sa.Column(
            "logged_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )
    op.create_index("ix_task_time_logs_id", "task_time_logs", ["id"])
    op.create_index(
        "ix_task_time_logs_user_id", "task_time_logs", ["user_id"]
    )
    op.create_index(
        "ix_task_time_logs_assignment_id", "task_time_logs", ["assignment_id"]
    )
    op.create_index(
        "ix_task_time_logs_subtask_id", "task_time_logs", ["subtask_id"]
    )
    op.create_index(
        "ix_task_time_logs_course_id", "task_time_logs", ["course_id"]
    )
    op.create_index(
        "ix_task_time_logs_user_course", "task_time_logs", ["user_id", "course_id"]
    )
    op.create_index(
        "ix_task_time_logs_user_type",
        "task_time_logs",
        ["user_id", "assignment_type"],
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index("ix_task_time_logs_user_type", table_name="task_time_logs")
    op.drop_index("ix_task_time_logs_user_course", table_name="task_time_logs")
    op.drop_index("ix_task_time_logs_course_id", table_name="task_time_logs")
    op.drop_index("ix_task_time_logs_subtask_id", table_name="task_time_logs")
    op.drop_index(
        "ix_task_time_logs_assignment_id", table_name="task_time_logs"
    )
    op.drop_index("ix_task_time_logs_user_id", table_name="task_time_logs")
    op.drop_index("ix_task_time_logs_id", table_name="task_time_logs")
    op.drop_table("task_time_logs")

    op.drop_index(
        "ix_assignment_subtasks_assignment_id",
        table_name="assignment_subtasks",
    )
    op.drop_index(
        "ix_assignment_subtasks_id", table_name="assignment_subtasks"
    )
    op.drop_table("assignment_subtasks")
