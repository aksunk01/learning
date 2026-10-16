import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.schemas.rag import RAGSource


class ChatMessageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    role: str
    content: str
    sources: list[RAGSource] | None = None
    created_at: datetime


class ConversationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    course_id: uuid.UUID | None
    title: str | None
    created_at: datetime
    updated_at: datetime


class ConversationDetailResponse(ConversationResponse):
    messages: list[ChatMessageResponse]
