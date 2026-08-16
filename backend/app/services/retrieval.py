from uuid import UUID

from sqlalchemy.orm import Session

from app.models.course import Course
from app.models.course_material import CourseMaterial
from app.models.document_chunk import DocumentChunk
from app.services.embedding import EmbeddingService

MAX_COSINE_DISTANCE = 0.35

class RetrievalService:

    def __init__(self) -> None:
        self.embedding_service = EmbeddingService()

    def search_course(self, db: Session, user_id: UUID, course_id: UUID, query: str, limit: int = 5, max_distance: float = MAX_COSINE_DISTANCE):
        query_embedding = self.embedding_service.embed_query(query)

        distance = DocumentChunk.embedding.cosine_distance(query_embedding)

        results = (
            db.query(
                DocumentChunk,
                CourseMaterial,
                distance.label("distance")
            )
            .join(
                CourseMaterial,
                DocumentChunk.material_id == CourseMaterial.id
            ).join(
                Course,
                CourseMaterial.course_id == Course.id
            )
            .filter(
                Course.id == course_id,
                Course.user_id == user_id,
                DocumentChunk.embedding.isnot(None),
                distance <= max_distance
            )
            .order_by(distance)
            .limit(limit)
            .all()
        )

        return results