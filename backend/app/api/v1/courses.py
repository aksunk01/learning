from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.dependencies import get_db
from app.models.course import Course
from app.models.user import User
from app.schemas.course import CourseCreate, CourseResponse, CourseUpdate
from app.api.auth import get_current_user

router = APIRouter(
    prefix='/courses',
    tags=['Courses']
)

@router.post(
    "",
    response_model=CourseResponse,
    status_code=status.HTTP_201_CREATED
)

def create_course(course_data: CourseCreate, db:Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    course = Course(
        name=course_data.name,
        code=course_data.code,
        description=course_data.description,
        semester=course_data.semester,
        user_id=current_user.id
    )

    db.add(course)
    db.commit()
    db.refresh(course)

    return course

@router.get(
    "",
    response_model=list[CourseResponse]
)
def get_courses(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    courses = (db.query(Course).filter(Course.user_id == current_user.id).all())
    return courses


@router.get("/{course_id}", response_model=CourseResponse)
def get_course(course_id: UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    course = db.query(Course).filter(Course.id == course_id, Course.user_id == current_user.id).first()
    
    if course is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")

    return course

@router.put("/{course_id}", response_model=CourseResponse)
def update_course(course_id: UUID, course_data: CourseUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    course = db.query(Course).filter(Course.id == course_id, Course.user_id == current_user.id).first()
    
    if course is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")

    
    update_data = course_data.model_dump(
        exclude_unset=True
    )

    for field, value in update_data.items():
        setattr(course, field, value)
    
    db.commit()
    db.refresh(course)

    return course


@router.delete("/{course_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_course(course_id: UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    course = db.query(Course).filter(Course.id == course_id, Course.user_id == current_user.id).first()
    
    if course is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")

    db.delete(course)
    db.commit()

    return None