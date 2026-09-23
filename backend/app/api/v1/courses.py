from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.dependencies import get_db
from app.models.course import Course
from app.models.semester import Semester
from app.models.user import User
from app.schemas.course import CourseCreate, CourseResponse, CourseUpdate
from app.api.auth import get_current_user
from app.services.storage import delete_file

router = APIRouter(
    prefix='/courses',
    tags=['Courses']
)

def validate_semester_ownership(semester_id: UUID | None, db: Session, user_id: UUID) -> None:
    if semester_id is None:
        return

    semester = db.query(Semester).filter(Semester.id == semester_id, Semester.user_id == user_id).first()

    if semester is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Semester not found")

@router.post(
    "",
    response_model=CourseResponse,
    status_code=status.HTTP_201_CREATED
)

def create_course(course_data: CourseCreate, db:Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    validate_semester_ownership(course_data.semester_id, db, current_user.id)

    course = Course(
        name=course_data.name,
        code=course_data.code,
        description=course_data.description,
        semester_id=course_data.semester_id,
        schedule=course_data.schedule.model_dump() if course_data.schedule else None,
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

    if "semester_id" in update_data:
        validate_semester_ownership(update_data["semester_id"], db, current_user.id)

    for field, value in update_data.items():
        setattr(course, field, value)
    
    db.commit()
    db.refresh(course)

    return course


@router.delete("/{course_id}", status_code=status.HTTP_200_OK)
def delete_course(course_id: UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    course = db.query(Course).filter(Course.id == course_id, Course.user_id == current_user.id).first()
    
    if course is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")

    try:
        for material in course.materials:
            delete_file(material.file_path)
        
        db.delete(course)
        db.commit()
    except Exception as e:
        db.rollback()

        raise HTTPException(
            status_code = status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete course: {e}"
        )

    return{
        "message": "Course and all associated materials deleted successfully"
    }
