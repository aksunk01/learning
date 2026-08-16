import uuid
from datetime import datetime

from sqlalchemy import ForeignKey, String, Text, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class CourseMaterial(Base):
    __tablename__ = "course_materials"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        index=True,
    )

    course_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("courses.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    description: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    material_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
    )

    file_name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    file_path: Mapped[str] = mapped_column(
        String(500),
        nullable=False,
    )

    mime_type: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
    )

    file_size: Mapped[int | None] = mapped_column(
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default="now()",
    )

    processing_status: Mapped[str] = mapped_column(
        String(20),
        nullable = False,
        server_default="pending"
    )

    processing_error: Mapped[str | None] = mapped_column(
        Text,
        nullable=True
    )

    processed_at: Mapped[str | None] = mapped_column(
        DateTime(timezone=True),
        nullable = True
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default="now()",
        onupdate=datetime.utcnow,
    )

    course = relationship(
        "Course",
        back_populates="materials",
    )

    chunks = relationship(
        "DocumentChunk",
        back_populates="material",
        cascade="all, delete-orphan"
    )