import uuid

from pydantic import BaseModel, ConfigDict

class CourseBase(BaseModel):
    name: str
    code: str
    description: str | None = None
    semester: str | None = None
    schedule: dict | None = None


class CourseCreate(CourseBase):
    pass

class CourseUpdate(CourseBase):
    name: str | None = None
    code: str | None = None
    description: str | None = None
    semester: str | None = None
    schedule: dict | None = None


class CourseResponse(CourseBase):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    user_id: uuid.UUID
