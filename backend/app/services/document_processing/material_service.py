import os
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models.course_material import CourseMaterial
from app.services.document_processing.chunking import DocumentChunk
from app.services.document_processing.service import DocumentProcessingError, DocumentProcessingService
from app.services.assignment_processing import AssignmentProcessingService
from app.services.storage import download_file_to_temp
from app.services.embedding import EmbeddingService, EMBEDDING_DIMENSION, EMBEDDING_MODEL
from app.models.document_chunk import DocumentChunk as DcoumentChunkModel

class CourseMaterialProcessingService:

    def __init__(self) -> None:
        self.document_processor = DocumentProcessingService()
        self.embedding_service = EmbeddingService()
        self.assignment_processor = AssignmentProcessingService()
    
    def process(self, material: CourseMaterial, db:Session) -> list[DocumentChunk]:
        temp_file_path: str | None = None

        try:
            material.processing_status = "processing"
            material.processing_error = None

            db.commit()
            db.refresh(material)

            temp_file_path = download_file_to_temp(object_name = material.file_path, original_file_name = material.file_name)

            chunks = self.document_processor.process(temp_file_path)

            for chunk in chunks:
                chunk.embedding = self.embedding_service.embed_document(
                    text=chunk.content,
                    title=material.file_name
                )

            for chunk in chunks:
                if chunk.embedding is None or len(chunk.embedding) != 768:
                    raise DocumentProcessingError(
                        f"Chunk {chunk.chunk_index} has an invalid embedding"
                    )

            db.query(DcoumentChunkModel).filter(
                DcoumentChunkModel.material_id == material.id
            ).delete(synchronize_session=False)

            chunk_models = [
                DcoumentChunkModel(
                    material_id=material.id,
                    chunk_index=chunk.chunk_index,
                    content=chunk.content,
                    embedding=chunk.embedding,
                    page_start=chunk.page_start,
                    page_end = chunk.page_end,
                    slide_number = chunk.slide_number,
                    section = chunk.section,
                    chunk_metadata=chunk.metadata,
                    embedding_model = EMBEDDING_MODEL,
                    embedding_dimension = EMBEDDING_DIMENSION
                )
                for chunk in chunks
            ]

            db.add_all(chunk_models)

            db.flush()

            course_context_parts = [
                material.course.code,
                material.course.semester
            ]

            course_context = ", ".join(
                value
                for value in course_context_parts
                if value
            )

            self.assignment_processor.process_material(
                material=material,
                db=db,
                course_context=course_context or None,
                commit_changes=False
            )

            material.processing_status = "completed"
            material.processing_error = None
            material.processed_at = datetime.now(timezone.utc)

            db.commit()
            db.refresh(material)

            return chunks
        
        except Exception as e:
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
            if(temp_file_path is not None and os.path.exists(temp_file_path)):
                os.remove(temp_file_path)