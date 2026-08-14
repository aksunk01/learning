from uuid import UUID, uuid4

from io import BytesIO

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.db.dependencies import get_db
from app.api.auth import get_current_user
from app.models.course import Course
from app.models.course_material import CourseMaterial
from app.models.user import User
from app.schemas.course_materials import CourseMaterialResponse, CourseMaterialUpdate
from app.services.storage import upload_file, delete_file, download_file


router = APIRouter(
    prefix='/courses/{course_id}/materials',
    tags=['Course Materials']
)


@router.post("", response_model=CourseMaterialResponse, status_code=status.HTTP_201_CREATED)
async def create_course_material(course_id: UUID,
    name: str = Form(...),
    description: str | None = Form(None),
    material_type: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)):

    course = db.query(Course).filter(Course.id == course_id, Course.user_id == current_user.id).first()

    if course is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")

    file_data = await file.read()

    material_id = uuid4()

    object_name = (
        f"courses/{course.id}/materials/"
        f"{material_id}/{file.filename}"
    )

    try:
        upload_file(
            object_name = object_name,
            file_data = file_data,
            content_type = file.content_type
        )
    except Exception as e:
        raise HTTPException(
            status_code = status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload file {e}",
        )
    
    material = CourseMaterial(
        course_id=course_id,
        name=name,
        description=description,
        material_type=material_type,
        file_name=file.filename,
        file_path=object_name,
        mime_type=file.content_type,
        file_size=len(file_data)
    )

    try:
        db.add(material)
        db.commit()
        db.refresh(material)
    except Exception as e:
        db.rollback()

        try:
            delete_file(object_name)
        except Exception:
            pass

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create course material",
        )

    return material


@router.get("/{material_id}/file")
async def download_course_material(course_id: UUID, material_id: UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    material = (
        db.query(CourseMaterial).join(Course).filter(
            CourseMaterial.id == material_id,
            CourseMaterial.course_id == course_id,
            Course.user_id == current_user.id
        ).first()
    )

    if material is None:
        raise HTTPException(
            status_code =status.HTTP_404_NOT_FOUND,
            detail="Course material not found"
        )

    try:
        file_data = download_file(material.file_path)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve file"
        )
    return StreamingResponse(
        BytesIO(file_data),
        media_type=material.mime_type or "application/octet-stream",
        headers={
            "Content-Disposition": f'attachment; filename="{material.file_name}"',
        }
    )


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
    
    object_name = material.file_path

    try:
        delete_file(object_name)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete file from storage"
        )

    db.delete(material)
    db.commit()

    return {
        "message": "Course material and file deleted successfully"
    }