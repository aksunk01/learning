"""Deterministic priority scoring and capacity-aware selection for the Planner's daily plan.

Pure functions only - no DB access and no LLM calls. Given a list of candidate
Assignment objects (already fetched by the caller) and the current time, this
module scores each one by urgency/stakes/effort and greedily selects today's
Focus Now list under a time budget and a one-heavy-item-per-day cap, with the
remainder bucketed as Up Next.

Score = (U * T) / W^ALPHA
  U (urgency): overdue/due-today/upcoming, decaying with days until due.
  T (type weight): stakes by assignment type (exam > project > homework).
  W (effort weight): friction penalty by workload tag.
"""

from dataclasses import dataclass
from datetime import datetime

from app.models.assignment import Assignment

TYPE_WEIGHTS = {
    "exam": 2.0,
    "project": 1.5,
    "homework": 1.0,
}
DEFAULT_TYPE_WEIGHT = 1.0

EFFORT_SCORE_WEIGHTS = {
    "light": 1,
    "moderate": 2,
    "heavy": 4,
}
DEFAULT_EFFORT_SCORE_WEIGHT = EFFORT_SCORE_WEIGHTS["moderate"]

# Fallback effort -> minutes mapping, used only when Assignment.estimated_minutes
# isn't set. Deliberately separate from EFFORT_SCORE_WEIGHTS above - one feeds
# the ranking formula, the other feeds the capacity budget, and they don't have
# to move together.
EFFORT_MINUTES = {
    "light": 45,
    "moderate": 90,
    "heavy": 180,
}
DEFAULT_EFFORT_MINUTES = EFFORT_MINUTES["moderate"]

ALPHA = 0.6

# "light_first" mode: items due further out than this get a much steeper effort
# penalty, so light items due later in the week are cleared early and heavy ones
# wait until they're close. Items due sooner score as usual so deadlines still win.
LIGHT_FIRST_ALPHA = 1.5
LIGHT_FIRST_URGENT_DAYS = 1

DAILY_BUDGET_MINUTES = 5 * 60

UP_NEXT_CUTOFF = 10


@dataclass
class ScoredAssignment:
    assignment: Assignment
    score: float
    estimated_minutes: int
    days_left: int
    is_overdue: bool
    is_due_today: bool
    is_heavy: bool


def _urgency(days_left: int) -> float:
    if days_left < 0:
        return 4.5 + min(2.5, 0.5 * abs(days_left))
    if days_left == 0:
        return 3.8
    return 1.0 + 2.5 / (1 + 0.3 * days_left)


def estimate_minutes(assignment: Assignment) -> int:
    if assignment.estimated_minutes is not None:
        return assignment.estimated_minutes
    return EFFORT_MINUTES.get(assignment.effort, DEFAULT_EFFORT_MINUTES)


def score_assignment(assignment: Assignment, now: datetime, light_first: bool = False) -> ScoredAssignment:
    days_left = (assignment.due_at.date() - now.date()).days

    is_overdue = days_left < 0
    is_due_today = days_left == 0

    if assignment.priority_override is not None:
        score = assignment.priority_override
    else:
        urgency = _urgency(days_left)
        type_weight = TYPE_WEIGHTS.get(assignment.assignment_type, DEFAULT_TYPE_WEIGHT)
        effort_weight = EFFORT_SCORE_WEIGHTS.get(assignment.effort, DEFAULT_EFFORT_SCORE_WEIGHT)
        alpha = LIGHT_FIRST_ALPHA if light_first and days_left > LIGHT_FIRST_URGENT_DAYS else ALPHA
        score = (urgency * type_weight) / (effort_weight ** alpha)

    return ScoredAssignment(
        assignment=assignment,
        score=score,
        estimated_minutes=estimate_minutes(assignment),
        days_left=days_left,
        is_overdue=is_overdue,
        is_due_today=is_due_today,
        is_heavy=assignment.effort == "heavy",
    )


def select_daily_plan(
    candidates: list[Assignment],
    now: datetime,
    daily_budget_minutes: int = DAILY_BUDGET_MINUTES,
    up_next_cutoff: int = UP_NEXT_CUTOFF,
    light_first: bool = False,
) -> tuple[list[ScoredAssignment], list[ScoredAssignment]]:
    """Returns (focus_now, up_next).

    Single greedy pass: score every candidate, sort descending, then walk the
    list once taking each item that fits the remaining time budget and
    doesn't exceed the one-heavy-item-per-day cap. A lower-scored item that
    fits can be taken ahead of a higher-scored item that doesn't - this is a
    greedy heuristic, not an exhaustive/optimal packing. Everything not taken
    becomes Up Next, still in score order, truncated to up_next_cutoff.
    """
    scored = [score_assignment(a, now, light_first) for a in candidates]
    scored.sort(key=lambda s: (-s.score, s.assignment.due_at))

    focus_now: list[ScoredAssignment] = []
    up_next: list[ScoredAssignment] = []

    remaining_minutes = daily_budget_minutes
    heavy_used = False

    for item in scored:
        if item.is_heavy and heavy_used:
            up_next.append(item)
            continue

        if item.estimated_minutes > remaining_minutes:
            up_next.append(item)
            continue

        focus_now.append(item)
        remaining_minutes -= item.estimated_minutes
        if item.is_heavy:
            heavy_used = True

    return focus_now, up_next[:up_next_cutoff]
