from uuid import UUID
from datetime import date

from pydantic import BaseModel

from app.schemas.assignment import AssignmentResponse

class CourseSummary(BaseModel):
    course_id: UUID
    course_name: str
    course_code: str
    semester: str | None
    upcoming_count: int
    next_assignment: AssignmentResponse | None

class DailyWorkload(BaseModel):
    date: date
    count: int

class UpcomingCourseCount(BaseModel):
    course_id: UUID
    course_name: str
    course_code: str
    count: int

class DashboardCounts(BaseModel):
    upcoming: int
    overdue: int
    due_next_7_days: int

class DashboardResponse(BaseModel):
    upcoming: list[AssignmentResponse]
    overdue: list[AssignmentResponse]
    next_exam: AssignmentResponse | None
    next_project: AssignmentResponse | None
    due_next_7_days: list[AssignmentResponse]
    counts: DashboardCounts
    upcoming_by_course: list[UpcomingCourseCount]
    workload_next_7_days: list[DailyWorkload]
    course_summaries: list[CourseSummary]