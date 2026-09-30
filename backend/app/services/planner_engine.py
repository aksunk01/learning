"""Deterministic logic for the Planner feature's daily to-do list.

No scoring/estimation/AI happens here - the list is built entirely from
assignment type and due date:

  1. Any incomplete homework/project assignment due today (or overdue) goes
     on the list.
  2. If nothing homework/project is due today, fall back to surfacing the
     single next-due homework item, the single next-due project item, and
     the single next-due exam item (whichever of those exist), so the list
     is never empty while work remains.
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
from app.models.assignment import Assignment

# Types that make up the day-to-day work list. Exams only show up via the
# fallback (they're one-off, high-stakes events rather than recurring work).
DUE_TODAY_TYPES = ("homework", "project")

FALLBACK_TYPES = (
    ("homework", "Next homework due"),
    ("project", "Next project due"),
    ("exam", "Next exam due"),
)


@dataclass
class PlannerItem:
    assignment_id: UUID
    course_id: UUID
    course_name: str
    title: str
    assignment_type: str | None
    due_at: datetime | None
    is_overdue: bool
    reason: str


def _to_planner_item(assignment: Assignment, today, reason: str) -> PlannerItem:
    is_overdue = assignment.due_at is not None and assignment.due_at.date() < today

    return PlannerItem(
        assignment_id=assignment.id,
        course_id=assignment.course_id,
        course_name=assignment.course.name,
        title=assignment.title,
        assignment_type=assignment.assignment_type,
        due_at=assignment.due_at,
        is_overdue=is_overdue,
        reason="Overdue" if is_overdue else reason,
    )


def build_daily_todolist(db: Session, user, semester_id: UUID | None = None) -> tuple[list[PlannerItem], bool]:
    """Returns (items, is_fallback)."""
    overdue = query_overdue_assignments(db=db, user_id=user.id, semester_id=semester_id)
    upcoming = query_upcoming_assignments(db=db, user_id=user.id, semester_id=semester_id)

    today = current_wall_clock_time().date()

    due_now = [a for a in overdue if a.assignment_type in DUE_TODAY_TYPES] + [
        a
        for a in upcoming
        if a.assignment_type in DUE_TODAY_TYPES and a.due_at is not None and a.due_at.date() == today
    ]

    if due_now:
        due_now.sort(key=lambda a: a.due_at)
        items = [_to_planner_item(a, today, "Due today") for a in due_now]
        return items, False

    # Fallback: nothing homework/project due today - surface the next
    # upcoming item of each key type instead.
    all_active = sorted(overdue + upcoming, key=lambda a: a.due_at)

    items = []
    for assignment_type, reason in FALLBACK_TYPES:
        match = next((a for a in all_active if a.assignment_type == assignment_type), None)
        if match is not None:
            items.append(_to_planner_item(match, today, reason))

    return items, True
