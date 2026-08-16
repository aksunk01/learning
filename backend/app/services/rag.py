from uuid import UUID

from sqlalchemy.orm import Session
from app.services.generation import GenerationService
from app.services.retrieval import RetrievalService

class RAGService:
    def __init__(self) -> None:
        self.retrieval_service = RetrievalService()
        self.generation_service = GenerationService()

    def ask_course(self, db: Session, user_id: UUID, course_id: UUID, question: str, limit: int = 5)-> dict:
        results = self.retrieval_service.search_course(
            db=db,
            user_id=user_id,
            course_id=course_id,
            query=question,
            limit=limit
        )

        if not results:
            return {
                "answer":"I could not find any relevant course material for this question",
                "sources": []
            }

        context_parts: list[str] =[]
        sources: list[dict] = []

        for chunk, material, distance in results:
            location_parts: list[str] = []

            if chunk.page_start is not None:
                if (chunk.page_end is not None and chunk.page_end != chunk.page_start):
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
Source: {material.file_name}, {location}

{chunk.content}
""".strip()
            )

            sources.append(
                {
                    "material_id": str(material.id),
                    "file_name": material.file_name,
                    "chunk_index": chunk.chunk_index,
                    "page_start": chunk.page_start,
                    "page_end": chunk.page_end,
                    "slide_number": chunk.slide_number,
                    "section": chunk.section,
                    "distance": float(distance)
                }
            )

        context = "\n\n---\n\n".join(context_parts)

        answer = self.generation_service.generate_answer(
            question=question,
            context=context
        )

        return {
            "answer": answer,
            "sources": sources
        }