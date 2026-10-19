import re
import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, field_validator, model_validator

from app.schemas.semester import SemesterResponse

HEX_COLOR_PATTERN = re.compile(r"^#[0-9A-Fa-f]{6}$")


def validate_hex_color(value: str) -> str:
    if not HEX_COLOR_PATTERN.match(value):
        raise ValueError("Color must be a hex code in the form #RRGGBB")
    return value

class CourseMeeting(BaseModel):
    is_online: bool = False
    days: list[Literal[
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday",
        "sunday",
    ]] = []
    start_time: str | None = None
    end_time: str | None = None
    location: str | None = None

    @field_validator("start_time", "end_time")
    @classmethod
    def validate_time_format(cls, value: str | None) -> str | None:
        if value is None:
            return value

        # Check if the format is exactly HH:MM
        if not isinstance(value, str) or len(value) != 5 or value[2] != ':':
            raise ValueError("Time must be in HH:MM format")

        try:
            # Use datetime.strptime to validate and parse the time
            parsed_time = datetime.strptime(value, "%H:%M")
            # Reconstruct the string to ensure it's exactly HH:MM
            reconstructed = parsed_time.strftime("%H:%M")
            if reconstructed != value:
                raise ValueError("Time must be in HH:MM format")
            return value
        except ValueError as e:
            if "time data" in str(e) and "does not match format" in str(e):
                raise ValueError("Time must be in HH:MM format")
            raise e

    @model_validator(mode="after")
    def validate_meeting(self) -> "CourseMeeting":
        # Online classes have no fixed meeting time - any day/time given
        # alongside is_online=True is a contradiction, not just ignorable.
        if self.is_online:
            if self.days or self.start_time is not None or self.end_time is not None:
                raise ValueError("Online classes cannot have a meeting time")
            return self

        if not self.days:
            raise ValueError("Select at least one meeting day")

        if self.start_time is None or self.end_time is None:
            raise ValueError("Meeting start and end time are required")

        start_time = datetime.strptime(self.start_time, "%H:%M")
        end_time = datetime.strptime(self.end_time, "%H:%M")

        if end_time <= start_time:
            raise ValueError("end_time must be later than start_time")

        return self

class CourseSchedule(BaseModel):
    timezone: str
    meetings: list[CourseMeeting]

class CourseBase(BaseModel):
    name: str
    code: str
    description: str | None = None
    semester_id: uuid.UUID | None = None
    schedule: CourseSchedule | None = None
    color: str = "#3b82f6"

    @field_validator("color")
    @classmethod
    def validate_color(cls, value: str) -> str:
        return validate_hex_color(value)


class CourseCreate(CourseBase):
    pass

class CourseUpdate(CourseBase):
    name: str | None = None
    code: str | None = None
    description: str | None = None
    semester_id: uuid.UUID | None = None
    schedule: CourseSchedule | None = None
    color: str | None = None

    @field_validator("color")
    @classmethod
    def validate_color(cls, value: str | None) -> str | None:
        if value is None:
            return value
        return validate_hex_color(value)


class CourseResponse(CourseBase):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    user_id: uuid.UUID
    semester: SemesterResponse | None = None
