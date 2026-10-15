from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.api.auth import get_current_user
from app.db.dependencies import get_db
from app.models.conversation import Conversation
from app.models.course import Course
from app.models.user import User
from app.schemas.conversation import ConversationDetailResponse, ConversationResponse

router = APIRouter(
    prefix="/courses/{course_id}/conversations",
    tags=["Conversations"]
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


def _get_owned_conversation(course_id: UUID, conversation_id: UUID, db: Session, current_user: User) -> Conversation:
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
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found"
        )

    return conversation


@router.get("", response_model=list[ConversationResponse])
def get_conversations(course_id: UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    _get_owned_course(course_id, db, current_user)

    return (
        db.query(Conversation)
        .filter(
            Conversation.course_id == course_id,
            Conversation.user_id == current_user.id
        )
        .order_by(Conversation.updated_at.desc())
        .all()
    )


@router.get("/{conversation_id}", response_model=ConversationDetailResponse)
def get_conversation(course_id: UUID, conversation_id: UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    _get_owned_course(course_id, db, current_user)

    conversation = (
        db.query(Conversation)
        .options(joinedload(Conversation.messages))
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


@router.delete("/{conversation_id}", status_code=status.HTTP_200_OK)
def delete_conversation(course_id: UUID, conversation_id: UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    _get_owned_course(course_id, db, current_user)

    conversation = _get_owned_conversation(course_id, conversation_id, db, current_user)

    db.delete(conversation)
    db.commit()

    return {"message": "Conversation deleted successfully"}
