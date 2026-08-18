from pydantic import BaseModel
from typing import Optional
from uuid import UUID


class CourseBase(BaseModel):
    name: str
    code: str
    semester: str
    schedule: dict | None = None

    class Config:
        from_attributes = True


class CourseCreate(CourseBase):
    pass


class CourseUpdate(CourseBase):
    schedule: dict | None = None


class CourseResponse(CourseBase):
    id: UUID
    created_at: str
    updated_at: str
