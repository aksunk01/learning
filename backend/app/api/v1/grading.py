from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.auth import get_current_user
from app.db.dependencies import get_db
from app.models.course import Course
from app.models.course_material import CourseMaterial
from app.models.grading_category import GradingCategory
from app.models.user import User
from app.schemas.grading_category import (
    CourseGradeResponse,
    GradingCategoryCreate,
    GradingCategoryResponse,
    GradingCategoryUpdate,
)
from app.services.grade_calculation import compute_course_grade
from app.services.grading_processing import GradingCategoryProcessingService


router = APIRouter(
    prefix="/courses/{course_id}/grading-categories",
    tags=["Grading"]
)

grade_router = APIRouter(
    prefix="/courses/{course_id}/grade",
    tags=["Grading"]
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

    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found"
        )

    return course


def _get_owned_category(course_id: UUID, category_id: UUID, db: Session, current_user: User) -> GradingCategory:
    category = (
        db.query(GradingCategory)
        .join(Course)
        .filter(
            GradingCategory.id == category_id,
            GradingCategory.course_id == course_id,
            Course.user_id == current_user.id
        )
        .first()
    )

    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Grading category not found"
        )

    return category


@router.get("", response_model=list[GradingCategoryResponse])
def list_grading_categories(course_id: UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    "List a course's grading categories"

    _get_owned_course(course_id, db, current_user)

    return (
        db.query(GradingCategory)
        .filter(GradingCategory.course_id == course_id)
        .order_by(GradingCategory.created_at.asc())
        .all()
    )


@router.post("", response_model=GradingCategoryResponse, status_code=status.HTTP_201_CREATED)
def create_grading_category(course_id: UUID, category_create: GradingCategoryCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    "Manually create a grading category for a course"

    _get_owned_course(course_id, db, current_user)

    category = GradingCategory(
        course_id=course_id,
        material_id=None,
        name=category_create.name,
        weight_percent=category_create.weight_percent
    )

    db.add(category)
    db.commit()
    db.refresh(category)

    return category


@router.patch("/{category_id}", response_model=GradingCategoryResponse)
def update_grading_category(course_id: UUID, category_id: UUID, category_update: GradingCategoryUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    "Update a grading category's name or weight"

    category = _get_owned_category(course_id, category_id, db, current_user)

    update_data = category_update.model_dump(exclude_unset=True)

    for field, value in update_data.items():
        setattr(category, field, value)

    db.commit()
    db.refresh(category)

    return category


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_grading_category(course_id: UUID, category_id: UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    "Delete a grading category. Assignments in it become uncategorized."

    category = _get_owned_category(course_id, category_id, db, current_user)

    db.delete(category)
    db.commit()

    return None


@router.post("/detect", response_model=list[GradingCategoryResponse])
def detect_grading_categories(course_id: UUID, material_id: UUID | None = None, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    "Re-run grading-category extraction against an already-processed syllabus material"

    course = _get_owned_course(course_id, db, current_user)

    if material_id is not None:
        material = (
            db.query(CourseMaterial)
            .filter(
                CourseMaterial.id == material_id,
                CourseMaterial.course_id == course_id
            )
            .first()
        )

        if not material:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Course material not found"
            )
    else:
        material = (
            db.query(CourseMaterial)
            .filter(
                CourseMaterial.course_id == course_id,
                CourseMaterial.material_type.ilike("syllabus")
            )
            .order_by(CourseMaterial.created_at.desc())
            .first()
        )

        if not material:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No material tagged \"syllabus\" was found for this course. Upload one, or pass material_id explicitly."
            )

    if material.processing_status != "completed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This material hasn't finished processing yet, so there is no extracted text to scan for grading weights."
        )

    course_context_parts = [
        course.code,
        course.semester.name if course.semester else None,
    ]

    course_context = ", ".join(
        value
        for value in course_context_parts
        if value
    )

    try:
        categories = GradingCategoryProcessingService().process_material(
            material=material,
            db=db,
            course_context=course_context or None,
            commit_changes=True
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

    return categories


@grade_router.get("", response_model=CourseGradeResponse)
def get_course_grade(course_id: UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    "Compute the current course grade from graded assignments and category weights"

    _get_owned_course(course_id, db, current_user)

    return compute_course_grade(db, course_id)
