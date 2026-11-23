"""Daily plan assembly for the Planner feature.

Fetches candidate assignments (overdue + upcoming) and delegates scoring and
capacity-aware selection to planner_scoring.py. No AI involved here or there -
the LLM layer (planner_ai.py) only phrases/explains results, it doesn't pick them.
"""

from dataclasses import dataclass
from datetime import datetime
from uuid import UUID

from sqlalchemy.orm import Session

from app.api.v1.assignments import (
    current_wall_clock_time,
    query_overdue_assignments,
    query_upcoming_assignments,
)
from app.services import planner_scoring
from app.services.planner_scoring import ScoredAssignment


@dataclass
class PlannerItem:
    assignment_id: UUID
    course_id: UUID
    course_name: str
    title: str
    assignment_type: str | None
    due_at: datetime | None
    is_overdue: bool
    score: float
    estimated_minutes: int
    reason: str


def _reason(item: ScoredAssignment) -> str:
    if item.is_overdue:
        return "Overdue"
    if item.is_due_today:
        return "Due today"
    return "Upcoming priority"


def _to_planner_item(item: ScoredAssignment) -> PlannerItem:
    assignment = item.assignment

    return PlannerItem(
        assignment_id=assignment.id,
        course_id=assignment.course_id,
        course_name=assignment.course.name,
        title=assignment.title,
        assignment_type=assignment.assignment_type,
        due_at=assignment.due_at,
        is_overdue=item.is_overdue,
        score=item.score,
        estimated_minutes=item.estimated_minutes,
        reason=_reason(item),
    )


def build_daily_plan(db: Session, user, semester_id: UUID | None = None) -> tuple[list[PlannerItem], list[PlannerItem]]:
    """Returns (focus_now, up_next)."""
    overdue = query_overdue_assignments(db=db, user_id=user.id, semester_id=semester_id)
    upcoming = query_upcoming_assignments(db=db, user_id=user.id, semester_id=semester_id)

    now = current_wall_clock_time()

    focus_now, up_next = planner_scoring.select_daily_plan(
        overdue + upcoming, now, light_first=user.planner_algorithm == "light_first"
    )

    return [_to_planner_item(i) for i in focus_now], [_to_planner_item(i) for i in up_next]
