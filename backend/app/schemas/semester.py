import uuid
from datetime import date

from pydantic import BaseModel, ConfigDict, model_validator


class SemesterBase(BaseModel):
    name: str
    start_date: date | None = None
    end_date: date | None = None

    @model_validator(mode="after")
    def validate_date_range(self) -> "SemesterBase":
        if self.start_date and self.end_date and self.end_date < self.start_date:
            raise ValueError("end_date must be on or after start_date")

        return self


class SemesterCreate(SemesterBase):
    pass


class SemesterUpdate(BaseModel):
    name: str | None = None
    start_date: date | None = None
    end_date: date | None = None

    @model_validator(mode="after")
    def validate_date_range(self) -> "SemesterUpdate":
        if self.start_date and self.end_date and self.end_date < self.start_date:
            raise ValueError("end_date must be on or after start_date")

        return self


class SemesterResponse(SemesterBase):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    user_id: uuid.UUID
