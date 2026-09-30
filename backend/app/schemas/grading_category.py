from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, field_validator


def _validate_weight_percent(v: float | None) -> float | None:
    if v is not None and (v < 0 or v > 100):
        raise ValueError("Weight percent must be between 0 and 100 inclusive")
    return v


class GradingCategoryCreate(BaseModel):
    name: str
    weight_percent: float

    @field_validator("name")
    @classmethod
    def name_must_not_be_empty(cls, v: str) -> str:
        value = v.strip()

        if not value:
            raise ValueError("Name must not be blank or whitespace-only")

        return value

    @field_validator("weight_percent")
    @classmethod
    def weight_percent_must_be_between_0_and_100(cls, v: float) -> float:
        return _validate_weight_percent(v)


class GradingCategoryUpdate(BaseModel):
    name: str | None = None
    weight_percent: float | None = None

    @field_validator("name")
    @classmethod
    def name_must_not_be_empty(cls, v: str | None) -> str | None:
        if v is not None:
            value = v.strip()

            if not value:
                raise ValueError("Name must not be blank or whitespace-only")

            return value

        return v

    @field_validator("weight_percent")
    @classmethod
    def weight_percent_must_be_between_0_and_100(cls, v: float | None) -> float | None:
        return _validate_weight_percent(v)


class GradingCategoryResponse(BaseModel):
    id: UUID
    course_id: UUID
    material_id: UUID | None
    name: str
    weight_percent: float
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(
        from_attributes=True
    )


class CategoryGradeResponse(BaseModel):
    id: UUID
    name: str
    weight_percent: float
    percent: float | None
    points_earned: float
    points_possible: float
    graded_count: int
    total_count: int


class CourseGradeResponse(BaseModel):
    overall_percent: float | None
    weight_sum: float
    categories: list[CategoryGradeResponse]
    uncategorized_graded_count: int
