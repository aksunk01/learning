import json
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.api.auth import get_current_user
from app.db.dependencies import get_db
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


@router.post("/ask",response_model=CourseQuestionResponse)
def ask_course(course_id: UUID, request: CourseQuestionRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    _get_owned_course(course_id, db, current_user)

    service = RAGService()

    try:
        return service.ask_course(
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


@router.post("/ask/stream")
def ask_course_stream(course_id: UUID, request: CourseQuestionRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    _get_owned_course(course_id, db, current_user)

    service = RAGService()

    def event_stream():
        try:
            for event in service.ask_course_stream(
                db=db,
                user_id=current_user.id,
                course_id=course_id,
                question=request.question,
                limit=request.limit
            ):
                yield json.dumps(event) + "\n"
        except Exception as e:
            yield json.dumps({"type": "error", "message": str(e)}) + "\n"

    return StreamingResponse(event_stream(), media_type="application/x-ndjson")