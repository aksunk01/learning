import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class TaskTimeLog(Base):
    __tablename__ = "task_time_logs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        index=True
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    assignment_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("assignments.id", ondelete="CASCADE"),
        nullable=True,
        index=True
    )

    subtask_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("assignment_subtasks.id", ondelete="CASCADE"),
        nullable=True,
        index=True
    )

    # Denormalized from the parent assignment at write time so personalization
    # aggregation queries can filter on this table alone, without joining
    # through assignments/courses for every historical row.
    course_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("courses.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    assignment_type: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True
    )

    # Snapshot of the estimate shown to the student at completion time, so
    # editing an assignment's estimate later doesn't rewrite history.
    estimated_minutes: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True
    )

    actual_minutes: Mapped[int] = mapped_column(
        Integer,
        nullable=False
    )

    logged_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default="now()"
    )

    __table_args__ = (
        Index("ix_task_time_logs_user_course", "user_id", "course_id"),
        Index("ix_task_time_logs_user_type", "user_id", "assignment_type"),
    )

    assignment = relationship("Assignment")
    subtask = relationship("AssignmentSubtask", back_populates="time_logs")
    course = relationship("Course")
