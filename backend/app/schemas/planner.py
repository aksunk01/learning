from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, Field


class PlannerItemResponse(BaseModel):
    kind: str  # "assignment" | "subtask"
    assignment_id: UUID
    subtask_id: UUID | None = None
    course_id: UUID
    course_name: str
    title: str
    assignment_type: str | None = None
    due_at: datetime | None = None
    estimated_minutes: int
    raw_estimated_minutes: int
    weight_percent: float | None = None
    points: float | None = None
    difficulty: int | None = None
    priority_score: float
    priority_level: str
    is_overdue: bool
    is_manual_priority: bool
    chunk_label: str | None = None
    why: str | None = None


class TodayPlanResponse(BaseModel):
    items: list[PlannerItemResponse] = Field(default_factory=list)
    daily_available_minutes: int


class DayPlan(BaseModel):
    date: date
    items: list[PlannerItemResponse] = Field(default_factory=list)


class WeekPlanResponse(BaseModel):
    days: list[DayPlan] = Field(default_factory=list)
    daily_available_minutes: int


class WorkloadConflictResponse(BaseModel):
    as_of_date: date
    deficit_minutes: int
    contributing_items: list[PlannerItemResponse] = Field(default_factory=list)


class RecommendRequest(BaseModel):
    available_minutes: int = Field(gt=0)
    semester_id: UUID | None = None


class RecommendResponse(BaseModel):
    items: list[PlannerItemResponse] = Field(default_factory=list)
    explanation: str


class PlannerPreferenceResponse(BaseModel):
    daily_available_minutes: int


class PlannerPreferenceUpdate(BaseModel):
    daily_available_minutes: int | None = Field(default=None, gt=0)


class TaskTimeLogCreate(BaseModel):
    assignment_id: UUID | None = None
    subtask_id: UUID | None = None
    actual_minutes: int = Field(gt=0)


class TaskTimeLogResponse(BaseModel):
    id: UUID
    assignment_id: UUID | None
    subtask_id: UUID | None
    course_id: UUID
    assignment_type: str | None
    estimated_minutes: int | None
    actual_minutes: int
    logged_at: datetime

    class Config:
        from_attributes = True
