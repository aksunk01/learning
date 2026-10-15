import uuid

from pydantic import BaseModel

class CourseQuestionRequest(BaseModel):
    question: str
    limit: int = 5
    conversation_id: uuid.UUID | None = None


class RAGSource(BaseModel):
    source_id: int
    material_id: str
    file_name: str
    chunk_index: int
    page_start: int | None = None
    page_end: int | None = None
    slide_number: int | None = None
    section: str | None = None
    distance: float
    

class CourseQuestionResponse(BaseModel):
    answer: str
    sources: list[RAGSource]
    conversation_id: uuid.UUID