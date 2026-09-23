import uuid

from sqlalchemy import String, Date, ForeignKey
from sqlalchemy.orm import relationship, mapped_column, Mapped
from sqlalchemy.dialects.postgresql import UUID

from app.db.base import Base


class Semester(Base):
    __tablename__ = "semesters"

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
        String(100),
        nullable=False,
    )

    start_date: Mapped[Date | None] = mapped_column(
        Date,
        nullable=True,
    )

    end_date: Mapped[Date | None] = mapped_column(
        Date,
        nullable=True,
    )

    user = relationship(
        "User",
        back_populates="semesters",
    )

    courses = relationship(
        "Course",
        back_populates="semester",
    )
