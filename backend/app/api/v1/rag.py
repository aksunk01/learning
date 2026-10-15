import json
from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.api.auth import get_current_user
from app.db.dependencies import get_db
from app.models.chat_message import ChatMessage
from app.models.conversation import Conversation
from app.models.course import Course
from app.models.user import User
from app.schemas.rag import CourseQuestionRequest, CourseQuestionResponse
from app.services.rag import RAGService


router = APIRouter(
    prefix="/courses/{course_id}",
    tags=["RAG"]
)


def _get_owned_course(course_id: UUID, db: Session, current_user: User) -> Course:
    course = (
        db.query(Course)
        .filter(
            Course.id == course_id,
            Course.user_id == current_user.id
        )
        .first()
    )

    if course is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found"
        )

    return course


def _get_or_create_conversation(
    course_id: UUID,
    conversation_id: UUID | None,
    db: Session,
    current_user: User
) -> Conversation:
    if conversation_id is not None:
        conversation = (
            db.query(Conversation)
            .filter(
                Conversation.id == conversation_id,
                Conversation.course_id == course_id,
                Conversation.user_id == current_user.id
            )
            .first()
        )

        if conversation is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")

        return conversation

    conversation = Conversation(user_id=current_user.id, course_id=course_id)
    db.add(conversation)
    # Commit immediately (not just flush) so the conversation survives even
    # if the request is cancelled before a turn completes - otherwise the
    # client is left holding a conversation_id that got rolled back when the
    # session closed, and its next request 404s.
    db.commit()
    db.refresh(conversation)

    return conversation


def _record_turn(db: Session, conversation: Conversation, question: str, answer: str, sources: list[dict]) -> None:
    if conversation.title is None:
        conversation.title = question.strip().splitlines()[0][:80]

    conversation.updated_at = datetime.now(timezone.utc)

    db.add(ChatMessage(conversation_id=conversation.id, role="user", content=question))
    db.add(ChatMessage(conversation_id=conversation.id, role="assistant", content=answer, sources=sources))
    db.commit()


@router.post("/ask",response_model=CourseQuestionResponse)
def ask_course(course_id: UUID, request: CourseQuestionRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    _get_owned_course(course_id, db, current_user)

    conversation = _get_or_create_conversation(course_id, request.conversation_id, db, current_user)

    service = RAGService()

    try:
        result = service.ask_course(
            db=db,
            user_id=current_user.id,
            course_id=course_id,
            question=request.question,
            limit=request.limit
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to answer course question: {e}"
        )

    _record_turn(db, conversation, request.question, result["answer"], result["sources"])

    return {**result, "conversation_id": conversation.id}


@router.post("/ask/stream")
def ask_course_stream(course_id: UUID, request: CourseQuestionRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    _get_owned_course(course_id, db, current_user)

    conversation = _get_or_create_conversation(course_id, request.conversation_id, db, current_user)

    service = RAGService()

    def event_stream():
        answer_parts: list[str] = []
        sources: list[dict] = []

        yield json.dumps({"type": "conversation", "conversation_id": str(conversation.id)}) + "\n"

        try:
            for event in service.ask_course_stream(
                db=db,
                user_id=current_user.id,
                course_id=course_id,
                question=request.question,
                limit=request.limit
            ):
                if event["type"] == "sources":
                    sources = event["sources"]
                elif event["type"] == "token":
                    answer_parts.append(event["text"])
                elif event["type"] == "answer":
                    answer_parts = [event["answer"]]
                    sources = event.get("sources", [])

                yield json.dumps(event) + "\n"

            _record_turn(db, conversation, request.question, "".join(answer_parts), sources)
        except Exception as e:
            yield json.dumps({"type": "error", "message": str(e)}) + "\n"

    return StreamingResponse(event_stream(), media_type="application/x-ndjson")
