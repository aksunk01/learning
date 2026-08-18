import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, field_validator, model_validator

class CourseMeeting(BaseModel):
    days: list[Literal[
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday",
        "sunday",
    ]]
    start_time: str
    end_time: str
    location: str | None = None

    @field_validator("start_time", "end_time")
    @classmethod
    def validate_time_format(cls, value: str) -> str:
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
    def validate_meeting_times(self) -> "CourseMeeting":
        # Parse start and end times to compare them
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
    semester: str | None = None
    schedule: CourseSchedule | None = None


class CourseCreate(CourseBase):
    pass

class CourseUpdate(CourseBase):
    name: str | None = None
    code: str | None = None
    description: str | None = None
    semester: str | None = None
    schedule: CourseSchedule | None = None


class CourseResponse(CourseBase):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    user_id: uuid.UUID
