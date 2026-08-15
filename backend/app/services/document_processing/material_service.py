import os
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models.course_material import CourseMaterial
from app.services.document_processing.chunking import DocumentChunk
from app.services.document_processing.service import DocumentProcessingError, DocumentProcessingService
from app.services.storage import download_file_to_temp

class CourseMaterialProcessingService:

    def __init__(self) -> None:
        self.document_processor = DocumentProcessingService()
    
    def process(self, material: CourseMaterial, db:Session) -> list[DocumentChunk]:
        temp_file_path: str | None = None

        try:
            material.processing_status = "processing"
            material.processing_error = None

            db.commit()
            db.refresh(material)

            temp_file_path = download_file_to_temp(object_name = material.file_path, original_file_name = material.file_name)

            chunks = self.document_processor.process(temp_file_path)

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