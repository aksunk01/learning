import uuid
from datetime import datetime

from pgvector.sqlalchemy import VECTOR

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

class DocumentChunk(Base):
    __tablename__="document_chunks"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        index = True
    )

    material_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("course_materials.id", ondelete="CASCADE"),
        nullable = False,
        index = True
    )    

    chunk_index: Mapped[int] = mapped_column(
        Integer, nullable=False
    )

    content: Mapped[str] = mapped_column(
        Text,
        nullable=False
    )

    embedding: Mapped[list[float] | None] = mapped_column(
        VECTOR(768),
        nullable = True
    )

    page_start: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True
    )

    page_end: Mapped[int | None] = mapped_column(
        Integer,
        nullable = True
    )

    slide_number: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True
    )

    section: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True
    )

    chunk_metadata: Mapped[dict | None] = mapped_column(
        JSONB,
        nullable=True
    )

    embedding_model: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True
    )

    embedding_dimension: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default="now()"
    )

    material = relationship(
        "CourseMaterial",
        back_populates="chunks"
    )
