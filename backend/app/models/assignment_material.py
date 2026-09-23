import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class AssignmentMaterial(Base):
    __tablename__ = "assignment_materials"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        index=True
    )

    assignment_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("assignments.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    material_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("course_materials.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    relationship_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="reference"
    )

    is_primary: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default="now()"
    )

    # Unique constraint on assignment_id + material_id
    __table_args__ = (
        UniqueConstraint('assignment_id',
                          'material_id',
                          name='uq_assignment_material_assignment_material'),
    )

    # Relationships
    assignment = relationship(
        "Assignment",
        back_populates="assignment_materials"
    )

    material = relationship(
        "CourseMaterial",
        back_populates="assignment_materials"
    )
