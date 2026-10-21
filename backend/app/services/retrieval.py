from uuid import UUID

from sqlalchemy.orm import Session

from app.models.course import Course
from app.models.course_material import CourseMaterial
from app.models.document_chunk import DocumentChunk
from app.services.embedding import EmbeddingService

# Tuned for nomic-embed-text's cosine-distance distribution (Ollama). This is
# noticeably looser than the 0.45 that worked for Gemini's embedding space -
# nomic-embed-text puts legitimately relevant matches (e.g. a short query
# like "project 1" against its syllabus entry) as high as ~0.48, so a 0.45
# cutoff was silently discarding valid matches and returning "no relevant
# material" for real questions. Retrieval recall is intentionally favored
# here; the generation system prompt already instructs the model to say so
# when the retrieved material doesn't actually answer the question.
MAX_COSINE_DISTANCE = 0.55

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

    def search_user(self, db: Session, user_id: UUID, query: str, limit: int = 5, max_distance: float = MAX_COSINE_DISTANCE):
        """Cross-course search for auto-detection: same join as search_course but
        without the Course.id filter, scoped only to the user's own materials.
        Returns (DocumentChunk, CourseMaterial, Course, distance) tuples."""
        query_embedding = self.embedding_service.embed_query(query)

        distance = DocumentChunk.embedding.cosine_distance(query_embedding)

        results = (
            db.query(
                DocumentChunk,
                CourseMaterial,
                Course,
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
                Course.user_id == user_id,
                DocumentChunk.embedding.isnot(None),
                distance <= max_distance
            )
            .order_by(distance)
            .limit(limit)
            .all()
        )

        return results