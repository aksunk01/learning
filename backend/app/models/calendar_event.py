import uuid
from datetime import date, datetime

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class CalendarEvent(Base):
    __tablename__ = "calendar_events"

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

    course_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("courses.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    title: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    description: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    location: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )

    start_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=False),
        nullable=False,
        index=True,
    )

    end_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=False),
        nullable=True,
    )

    all_day: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        server_default="false",
    )

    color: Mapped[str | None] = mapped_column(
        String(7),
        nullable=True,
    )

    # Recurrence rule, flattened onto the series row rather than a separate
    # table - there's only ever one rule per event. `recurrence_frequency`
    # null means "does not repeat"; the other three columns are only
    # meaningful when it's set (days_of_week for "weekly", the rest apply to
    # every frequency).
    recurrence_frequency: Mapped[str | None] = mapped_column(
        String(10),
        nullable=True,
    )

    recurrence_interval: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=1,
        server_default="1",
    )

    recurrence_days_of_week: Mapped[list | None] = mapped_column(
        JSONB,
        nullable=True,
    )

    recurrence_end_date: Mapped[date | None] = mapped_column(
        Date,
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default="now()",
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default="now()",
        onupdate=datetime.utcnow,
    )

    user = relationship(
        "User",
        back_populates="calendar_events",
    )

    course = relationship(
        "Course",
    )

    overrides = relationship(
        "CalendarEventOverride",
        back_populates="event",
        cascade="all, delete-orphan",
    )

    @property
    def recurrence(self):
        if not self.recurrence_frequency:
            return None

        return {
            "frequency": self.recurrence_frequency,
            "interval": self.recurrence_interval,
            "days_of_week": self.recurrence_days_of_week or [],
            "end_date": self.recurrence_end_date,
        }


# One exception to a recurring event's series: either a cancelled occurrence
# (is_cancelled=True) or a modified one, where any non-null field here wins
# over the series' value for that single `occurrence_date`. Mirrors iCal's
# EXDATE/RECURRENCE-ID override model, simplified to one override row per
# changed occurrence instead of a full exception event.
class CalendarEventOverride(Base):
    __tablename__ = "calendar_event_overrides"
    __table_args__ = (
        UniqueConstraint("event_id", "occurrence_date", name="uq_calendar_event_override_occurrence"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    event_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("calendar_events.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    occurrence_date: Mapped[date] = mapped_column(
        Date,
        nullable=False,
        index=True,
    )

    is_cancelled: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        server_default="false",
    )

    title: Mapped[str | None] = mapped_column(String(255), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    location: Mapped[str | None] = mapped_column(String(255), nullable=True)
    start_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=False), nullable=True)
    end_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=False), nullable=True)
    all_day: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    color: Mapped[str | None] = mapped_column(String(7), nullable=True)
    course_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("courses.id", ondelete="SET NULL"),
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default="now()",
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default="now()",
        onupdate=datetime.utcnow,
    )

    event = relationship(
        "CalendarEvent",
        back_populates="overrides",
    )

    course = relationship(
        "Course",
    )
