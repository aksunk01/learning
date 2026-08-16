import uuid
from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

class Assignment(Base):
    __tablename__ = "assignments"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        index=True
    )

    course_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("courses.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    material_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("course_materials.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )

    title: Mapped[str] = mapped_column(
        String(255),
        nullable=False
    )

    description: Mapped[str | None] = mapped_column(
        Text,
        nullable=True
    )

    assignment_type: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True
    )

    due_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True
    )

    points: Mapped[float | None] = mapped_column(
        Float,
        nullable=True
    )

    weight_percent: Mapped[float | None] = mapped_column(
        Float,
        nullable=True
    )

    source_page: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True
    )

    source_slide: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True
    )

    source_section: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True
    )

    source_chunk_index: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True
    )

    extraction_metadata: Mapped[dict | None] = mapped_column(
        JSONB,
        nullable=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default="now()"
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default="now()",
        onupdate=datetime.utcnow
    )

    course = relationship(
        "Course",
        back_populates="assignments"
    )

    material = relationship(
        "CourseMaterial",
        back_populates="assignments"
    )