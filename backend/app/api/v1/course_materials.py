from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.dependencies import get_db
from app.api.auth import get_current_user
from app.models.course import Course
from app.models.course_material import CourseMaterial
from app.models.user import User
from app.schemas.course_materials import CourseMaterialCreate, CourseMaterialResponse, CourseMaterialUpdate

router = APIRouter(
    prefix='/courses/{course_id}/materials',
    tags=['Course Materials']
)


@router.post("", response_model=CourseMaterialResponse, status_code=status.HTTP_201_CREATED)
def create_course_material(course_id: UUID, material_data: CourseMaterialCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):

    course = db.query(Course).filter(Course.id == course_id, Course.user_id == current_user.id).first()

    if course is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")
    
    material = CourseMaterial(
        course_id=course_id,
        name=material_data.name,
        description=material_data.description,
        material_type=material_data.material_type,
        file_name=material_data.file_name,
        file_path=material_data.file_path,
        mime_type=material_data.mime_type,
        file_size=material_data.file_size
    )

    db.add(material)
    db.commit()
    db.refresh(material)

    return material


@router.get("", response_model=list[CourseMaterialResponse])
def get_course_materials(course_id: UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    course = db.query(Course).filter(Course.id == course_id, Course.user_id == current_user.id).first()

    if course is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")

    materials = db.query(CourseMaterial).filter(CourseMaterial.course_id == course_id).all()

    return materials

@router.get("/{material_id}", response_model=CourseMaterialResponse)
def get_course_material(course_id: UUID, material_id: UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    material = db.query(CourseMaterial).join(Course).filter(
        CourseMaterial.id == material_id,
        CourseMaterial.course_id == course_id,
        Course.user_id == current_user.id
    ).first()

    if material is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course material not found")
    
    return material


@router.put("/{material_id}", response_model=CourseMaterialResponse)
def update_course_material(course_id: UUID, material_id: UUID, material_data: CourseMaterialUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    material = db.query(CourseMaterial).join(Course).filter(
        CourseMaterial.id == material_id,
        CourseMaterial.course_id == course_id,
        Course.user_id == current_user.id
    ).first()

    if material is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course material not found")

    update_data = material_data.model_dump(exclude_unset=True)

    for field, value in update_data.items():
        setattr(material, field, value)

    db.commit()
    db.refresh(material)

    return material


@router.delete("/{material_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_course_material(course_id: UUID, material_id: UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    material = db.query(CourseMaterial).join(Course).filter(
        CourseMaterial.id == material_id,
        CourseMaterial.course_id == course_id,
        Course.user_id == current_user.id
    ).first()

    if material is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course material not found")

    db.delete(material)
    db.commit()

    return None