from sqlalchemy.orm import Session
from datetime import datetime
from zoneinfo import ZoneInfo

from app.models.assignment import Assignment
from app.models.course_material import CourseMaterial
from app.models.document_chunk import DocumentChunk
from app.services.assignment_extraction import AssignmentExtractionService

EASTER_TIME = ZoneInfo("America/New_York")
UTC = ZoneInfo("UTC")


def normalize_due_at(due_date: str | None, due_time: str | None,) -> datetime | None:
    if due_date is None:
        return None

    time_value = due_time or "23:59"

    local_datetime = datetime.fromisoformat(
        f"{due_date}T{time_value}"
    ).replace(
        tzinfo=EASTER_TIME
    )

    return local_datetime.astimezone(UTC)


class AssignmentProcessingService:

    def __init__(self) -> None:
        self.extraction_service = AssignmentExtractionService()

    def process_material(self, material: CourseMaterial, db: Session, course_context: str | None = None) -> list[Assignment]:
        chunks = (
            db.query(DocumentChunk)
            .filter(
                DocumentChunk.material_id == material.id
            )
            .order_by(
                DocumentChunk.chunk_index
            )
            .all()
        )

        if not chunks:
            raise ValueError(
                "Course material has no processed document chunks"
            )

        source_map: dict[int, DocumentChunk] = {}
        context_parts: list[str] = []

        for source_id, chunk in enumerate(chunks, start=1):
            source_map[source_id] = chunk

            location_parts: list[str] = []

            if chunk.page_start is not None:
                if(chunk.page_end is not None and chunk.page_end != chunk.page_start):
                    location_parts.append(
                        f"pages {chunk.page_start}-{chunk.page_end}"
                    )
                else:
                    location_parts.append(
                        f"page {chunk.page_start}"
                    )

            if chunk.slide_number is not None:
                location_parts.append(
                    f"slide {chunk.slide_number}"
                )

            if chunk.section:
                location_parts.append(
                    f"section {chunk.section}"
                )

            location = (
                ", ".join(location_parts)
                if location_parts
                else "location not specified"
            )

            context_parts.append(
                f"""
[SOURCE_{source_id}]
Chunk {chunk.chunk_index}
Source: {material.file_name}, {location}

{chunk.content}
""".strip()
            )

        combined_text = "\n\n---\n\n".join(context_parts)

        extraction_result = self.extraction_service.extract_assignments(
            text=combined_text,
            course_context=course_context
        )

        assignment_models: list[Assignment] = []

        for extracted in extraction_result.assignments:
            valid_source_ids = [
                source_id
                for source_id in extracted.source_ids
                if source_id in source_map
            ]

            primary_chunk = (
                source_map[valid_source_ids[0]]
                if valid_source_ids
                else None
            )

            source_details = []

            for source_id in valid_source_ids:
                source_chunk = source_map[source_id]

                source_details.append(
                    {
                        "source_id": source_id,
                        "chunk_index": source_chunk.chunk_index,
                        "page_start": source_chunk.page_start,
                        "page_end": source_chunk.page_end,
                        "slide_number": source_chunk.slide_number,
                        "section": source_chunk.section
                    }
                )

            assignment = Assignment(
                course_id = material.course_id,
                material_id = material.id,
                title = extracted.title,
                description = extracted.description,
                assignment_type = extracted.assignment_type,
                due_at = normalize_due_at(
                    extracted.due_date,
                    extracted.due_time
                ),
                points = extracted.points,
                weight_percent = extracted.weight_percent,

                source_page=(
                    primary_chunk.page_start
                    if primary_chunk
                    else None
                ),

                source_slide=(
                    primary_chunk.slide_number
                    if primary_chunk
                    else None
                ),

                source_section=(
                    primary_chunk.section
                    if primary_chunk
                    else None
                ),

                source_chunk_index=(
                    primary_chunk.chunk_index
                    if primary_chunk
                    else None
                ),

                extraction_metadata={
                    "raw_due_text": extracted.raw_due_text,
                    "source_ids": valid_source_ids,
                    "sources": source_details
                }
            )

            assignment_models.append(assignment)

        db.query(Assignment).filter(
            Assignment.material_id == material.id
        ).delete(synchronize_session=False)

        db.add_all(assignment_models)

        db.commit()

        for assignment in assignment_models:
            db.refresh(assignment)

        return assignment_models