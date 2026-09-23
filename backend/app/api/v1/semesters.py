from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.dependencies import get_db
from app.models.semester import Semester
from app.models.user import User
from app.schemas.semester import SemesterCreate, SemesterResponse, SemesterUpdate
from app.api.auth import get_current_user

router = APIRouter(
    prefix="/semesters",
    tags=["Semesters"]
)


@router.post(
    "",
    response_model=SemesterResponse,
    status_code=status.HTTP_201_CREATED
)
def create_semester(semester_data: SemesterCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    semester = Semester(
        name=semester_data.name,
        start_date=semester_data.start_date,
        end_date=semester_data.end_date,
        user_id=current_user.id
    )

    db.add(semester)
    db.commit()
    db.refresh(semester)

    return semester


@router.get(
    "",
    response_model=list[SemesterResponse]
)
def get_semesters(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return (
        db.query(Semester)
        .filter(Semester.user_id == current_user.id)
        .order_by(Semester.start_date.desc().nullslast(), Semester.name.asc())
        .all()
    )


@router.get("/{semester_id}", response_model=SemesterResponse)
def get_semester(semester_id: UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    semester = db.query(Semester).filter(Semester.id == semester_id, Semester.user_id == current_user.id).first()

    if semester is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Semester not found")

    return semester


@router.put("/{semester_id}", response_model=SemesterResponse)
def update_semester(semester_id: UUID, semester_data: SemesterUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    semester = db.query(Semester).filter(Semester.id == semester_id, Semester.user_id == current_user.id).first()

    if semester is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Semester not found")

    update_data = semester_data.model_dump(exclude_unset=True)

    for field, value in update_data.items():
        setattr(semester, field, value)

    db.commit()
    db.refresh(semester)

    return semester


@router.delete("/{semester_id}", status_code=status.HTTP_200_OK)
def delete_semester(semester_id: UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    semester = db.query(Semester).filter(Semester.id == semester_id, Semester.user_id == current_user.id).first()

    if semester is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Semester not found")

    db.delete(semester)
    db.commit()

    return {
        "message": "Semester deleted successfully. Courses assigned to this semester are now unassigned."
    }
