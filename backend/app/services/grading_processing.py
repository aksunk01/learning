from sqlalchemy.orm import Session

from app.models.course_material import CourseMaterial
from app.models.document_chunk import DocumentChunk
from app.models.grading_category import GradingCategory
from app.services.grading_extraction import GradingCategoryExtractionService


class GradingCategoryProcessingService:

    def __init__(self) -> None:
        self.extraction_service = GradingCategoryExtractionService()

    def process_material(self, material: CourseMaterial, db: Session, course_context: str | None = None, commit_changes: bool = True) -> list[GradingCategory]:
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

        combined_text = "\n\n---\n\n".join(
            chunk.content for chunk in chunks
        )

        extraction_result = self.extraction_service.extract_categories(
            text=combined_text,
            course_context=course_context
        )

        category_models = [
            GradingCategory(
                course_id=material.course_id,
                material_id=material.id,
                name=extracted.name,
                weight_percent=extracted.weight_percent
            )
            for extracted in extraction_result.categories
        ]

        db.query(GradingCategory).filter(
            GradingCategory.material_id == material.id
        ).delete(synchronize_session=False)

        db.add_all(category_models)

        if commit_changes:
            db.commit()

            for category in category_models:
                db.refresh(category)
        else:
            db.flush()

        return category_models
