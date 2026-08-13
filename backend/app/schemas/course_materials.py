import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class CourseMaterialBase(BaseModel):
    name: str
    description: str | None = None
    material_type: str
    file_name: str
    file_path: str
    mime_type: str | None = None
    file_size: int | None = None


class CourseMaterialCreate(CourseMaterialBase):
    pass


class CourseMaterialUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    material_type: str | None = None
    file_name: str | None = None
    file_path: str | None = None
    mime_type: str | None = None
    file_size: int | None = None


class CourseMaterialResponse(CourseMaterialBase):
    id: uuid.UUID
    course_id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)