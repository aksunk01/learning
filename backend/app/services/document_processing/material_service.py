import os
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models.assignment import Assignment
from app.models.course_material import CourseMaterial
from app.models.document_chunk import DocumentChunk as DocumentChunkModel
from app.services.assignment_processing import AssignmentProcessingService
from app.services.document_processing.chunking import DocumentChunk
from app.services.document_processing.service import (
    DocumentProcessingError,
    DocumentProcessingService,
)
from app.services.embedding import (
    EMBEDDING_DIMENSION,
    EMBEDDING_MODEL,
    EmbeddingService,
)
from app.services.storage import download_file_to_temp


class CourseMaterialProcessingService:

    def __init__(self) -> None:
        self.document_processor = DocumentProcessingService()
        self.embedding_service = EmbeddingService()
        self.assignment_processor = AssignmentProcessingService()

    def process(
        self,
        material: CourseMaterial,
        db: Session,
    ) -> list[DocumentChunk]:
        temp_file_path: str | None = None

        try:
            # Mark the material as currently processing.
            material.processing_status = "processing"
            material.processing_error = None
            material.processed_at = None

            db.commit()
            db.refresh(material)

            # Download the original file from MinIO to a temporary local file.
            temp_file_path = download_file_to_temp(
                object_name=material.file_path,
                original_file_name=material.file_name,
            )

            # Parse and chunk the document using the current parser implementation.
            chunks = self.document_processor.process(
                temp_file_path
            )

            # Generate embeddings for every newly generated chunk.
            #
            # This happens BEFORE deleting the old database rows so that
            # an embedding failure does not destroy the currently usable data.
            for chunk in chunks:
                chunk.embedding = self.embedding_service.embed_document(
                    text=chunk.content,
                    title=material.file_name,
                )

            # Validate every embedding before modifying old persisted data.
            for chunk in chunks:
                if (
                    chunk.embedding is None
                    or len(chunk.embedding) != EMBEDDING_DIMENSION
                ):
                    raise DocumentProcessingError(
                        f"Chunk {chunk.chunk_index} has an invalid embedding"
                    )

            # ==============================================================
            # Everything from here until db.commit() is the replacement
            # transaction for previously derived material data.
            #
            # If anything fails, db.rollback() restores the old rows.
            # ==============================================================

            # Delete old persisted chunks generated from this material.
            db.query(DocumentChunkModel).filter(
                DocumentChunkModel.material_id == material.id
            ).delete(
                synchronize_session=False
            )

            # Delete old assignments/exams/projects extracted specifically
            # from this material so reprocessing does not create duplicates.
            db.query(Assignment).filter(
                Assignment.material_id == material.id
            ).delete(
                synchronize_session=False
            )

            # Create the replacement DocumentChunk database rows.
            chunk_models = [
                DocumentChunkModel(
                    material_id=material.id,
                    chunk_index=chunk.chunk_index,
                    content=chunk.content,
                    embedding=chunk.embedding,
                    page_start=chunk.page_start,
                    page_end=chunk.page_end,
                    slide_number=chunk.slide_number,
                    section=chunk.section,
                    chunk_metadata=chunk.metadata,
                    embedding_model=EMBEDDING_MODEL,
                    embedding_dimension=EMBEDDING_DIMENSION,
                )
                for chunk in chunks
            ]

            db.add_all(chunk_models)

            # Flush without committing so the new chunks are available to
            # subsequent processing within this same transaction.
            db.flush()

            # Build optional course context for assignment extraction.
            course_context_parts = [
                material.course.code,
                material.course.semester,
            ]

            course_context = ", ".join(
                value
                for value in course_context_parts
                if value
            )

            # Re-extract assignments, exams, and projects using the newly
            # generated chunks.
            #
            # commit_changes=False is important because this outer service
            # owns the transaction.
            self.assignment_processor.process_material(
                material=material,
                db=db,
                course_context=course_context or None,
                commit_changes=False,
            )

            # Processing has fully succeeded.
            material.processing_status = "completed"
            material.processing_error = None
            material.processed_at = datetime.now(timezone.utc)

            # Commit the replacement chunks, assignments, and material state
            # together.
            db.commit()
            db.refresh(material)

            return chunks

        except Exception as e:
            # Roll back any replacement deletes/inserts if processing fails.
            db.rollback()

            material.processing_status = "failed"
            material.processing_error = str(e)
            material.processed_at = None

            db.commit()
            db.refresh(material)

            if isinstance(e, DocumentProcessingError):
                raise

            raise DocumentProcessingError(
                f"Failed to process course material: {e}"
            ) from e

        finally:
            # The source file remains in MinIO. Only the temporary local
            # processing copy is deleted.
            if (
                temp_file_path is not None
                and os.path.exists(temp_file_path)
            ):
                os.remove(temp_file_path)

    def reprocess(
        self,
        material: CourseMaterial,
        db: Session,
    ) -> list[DocumentChunk]:
        """
        Reprocess an existing CourseMaterial using the original file stored
        in MinIO.

        process() already safely replaces old chunks and extracted
        assignments, so reprocessing uses the exact same pipeline.
        """

        return self.process(
            material=material,
            db=db,
        )