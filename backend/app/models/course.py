import uuid

from sqlalchemy import String, ForeignKey, Text
from sqlalchemy.orm import relationship, mapped_column, Mapped
from sqlalchemy.dialects.postgresql import UUID

from app.db.base import Base

class Course(Base):
    __tablename__ = "courses"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        index=True,
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    code: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
    )

    description: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    semester: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
    )

    user = relationship(
        "User",
        back_populates="courses",
    )

    materials = relationship(
        "CourseMaterial",
        back_populates="course",
        cascade="all, delete-orphan"
    )

    