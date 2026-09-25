"""Deterministic priority scoring and time-allocation engine for the Planner
feature. No LLM calls happen anywhere in this module - see planner_ai.py for
the (optional, fallback-guarded) natural-language layer built on top of this.
"""

import copy
from dataclasses import dataclass
from datetime import date, datetime, timedelta
from uuid import UUID

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.v1.assignments import query_upcoming_assignments, current_wall_clock_time
from app.models.assignment import Assignment
from app.models.assignment_subtask import AssignmentSubtask
from app.models.task_time_log import TaskTimeLog
from app.models.planner_preference import PlannerPreference

DEFAULT_DAILY_AVAILABLE_MINUTES = 120

DEFAULT_ESTIMATED_MINUTES_BY_TYPE = {
    "exam": 120,
    "project": 180,
    "paper": 120,
    "homework": 60,
    "quiz": 30,
    "lab": 90,
    "other": 60,
}

W_URGENCY = 0.6
W_PACE = 0.6
IMPORTANCE_BOOST = 1.5
DIFFICULTY_BOOST = 0.2

MIN_SAMPLES_FOR_MULTIPLIER = 3
MULTIPLIER_MIN = 0.5
MULTIPLIER_MAX = 3.0

PRIORITY_LEVEL_THRESHOLDS = [
    (0.8, "Critical"),
    (0.4, "High"),
    (0.15, "Medium"),
]


def priority_level_for_score(score: float) -> str:
    for threshold, label in PRIORITY_LEVEL_THRESHOLDS:
        if score >= threshold:
            return label
    return "Low"


@dataclass
class PlannerItem:
    kind: str  # "assignment" | "subtask"
    assignment_id: UUID
    subtask_id: UUID | None
    course_id: UUID
    course_name: str
    title: str
    assignment_type: str | None
    due_at: datetime | None
    raw_estimated_minutes: int
    estimated_minutes: int
    weight_percent: float | None
    points: float | None
    difficulty: int | None
    priority_score: float = 0.0
    priority_level: str = "Low"
    is_overdue: bool = False
    is_manual_priority: bool = False
    scheduled_date_override: date | None = None
    chunk_label: str | None = None
    chunk_index: int = 0
    priority_override_value: float | None = None

    @property
    def item_id(self) -> str:
        return f"subtask:{self.subtask_id}" if self.subtask_id else f"assignment:{self.assignment_id}"


def get_planner_preference(db: Session, user_id: UUID) -> PlannerPreference:
    pref = (
        db.query(PlannerPreference)
        .filter(PlannerPreference.user_id == user_id)
        .first()
    )

    if pref is None:
        pref = PlannerPreference(user_id=user_id)
        db.add(pref)

        try:
            db.commit()
        except IntegrityError:
            # Another concurrent request for this user already created the
            # row (e.g. Today/Week loading in parallel) - fall back to
            # reading what it inserted instead of failing this request.
            db.rollback()
            pref = (
                db.query(PlannerPreference)
                .filter(PlannerPreference.user_id == user_id)
                .first()
            )
        else:
            db.refresh(pref)

    return pref


def get_estimate_multiplier(db: Session, user_id: UUID, course_id: UUID, assignment_type: str | None) -> float:
    course_rows = (
        db.query(TaskTimeLog)
        .filter(
            TaskTimeLog.user_id == user_id,
            TaskTimeLog.course_id == course_id,
        )
        .all()
    )

    rows = course_rows

    if len(rows) < MIN_SAMPLES_FOR_MULTIPLIER and assignment_type is not None:
        type_rows = (
            db.query(TaskTimeLog)
            .filter(
                TaskTimeLog.user_id == user_id,
                TaskTimeLog.assignment_type == assignment_type,
            )
            .all()
        )

        if len(type_rows) >= MIN_SAMPLES_FOR_MULTIPLIER:
            rows = type_rows

    if len(rows) < MIN_SAMPLES_FOR_MULTIPLIER:
        return 1.0

    total_estimated = sum(r.estimated_minutes or 0 for r in rows)
    total_actual = sum(r.actual_minutes for r in rows)

    if total_estimated <= 0:
        return 1.0

    multiplier = total_actual / total_estimated
    return max(MULTIPLIER_MIN, min(MULTIPLIER_MAX, multiplier))


def _default_estimate(assignment_type: str | None) -> int:
    return DEFAULT_ESTIMATED_MINUTES_BY_TYPE.get(assignment_type or "other", 60)


def load_planner_items(db: Session, user, semester_id: UUID | None = None) -> list[PlannerItem]:
    """Load every incomplete assignment/subtask as a normalized PlannerItem
    with a computed, personalized priority_score, sorted descending."""
    assignments = query_upcoming_assignments(
        db=db,
        user_id=user.id,
        semester_id=semester_id,
    )

    now = current_wall_clock_time()
    today = now.date()

    items: list[PlannerItem] = []

    for assignment in assignments:
        multiplier = get_estimate_multiplier(
            db, user.id, assignment.course_id, assignment.assignment_type
        )

        incomplete_subtasks = [s for s in assignment.subtasks if not s.is_completed]

        if incomplete_subtasks:
            for subtask in incomplete_subtasks:
                items.append(
                    PlannerItem(
                        kind="subtask",
                        assignment_id=assignment.id,
                        subtask_id=subtask.id,
                        course_id=assignment.course_id,
                        course_name=assignment.course.name,
                        title=subtask.title,
                        assignment_type=assignment.assignment_type,
                        due_at=assignment.due_at,
                        raw_estimated_minutes=subtask.estimated_minutes,
                        estimated_minutes=round(subtask.estimated_minutes * multiplier),
                        weight_percent=assignment.weight_percent,
                        points=assignment.points,
                        difficulty=assignment.difficulty,
                        scheduled_date_override=subtask.scheduled_date,
                    )
                )
        else:
            raw_minutes = assignment.estimated_minutes or _default_estimate(assignment.assignment_type)

            items.append(
                PlannerItem(
                    kind="assignment",
                    assignment_id=assignment.id,
                    subtask_id=None,
                    course_id=assignment.course_id,
                    course_name=assignment.course.name,
                    title=assignment.title,
                    assignment_type=assignment.assignment_type,
                    due_at=assignment.due_at,
                    raw_estimated_minutes=raw_minutes,
                    estimated_minutes=round(raw_minutes * multiplier),
                    weight_percent=assignment.weight_percent,
                    points=assignment.points,
                    difficulty=assignment.difficulty,
                    scheduled_date_override=assignment.scheduled_date,
                )
            )

        # Track priority_override / is_overdue per-assignment info against
        # the item(s) we just appended for it.
        assignment_items = [
            i for i in items
            if i.assignment_id == assignment.id
        ]

        for item in assignment_items:
            if item.due_at is not None and item.due_at < now:
                item.is_overdue = True

            item.priority_override_value = assignment.priority_override

    daily_available_minutes = get_planner_preference(db, user.id).daily_available_minutes

    for item in items:
        _score_item(item, today, daily_available_minutes)

    items.sort(key=lambda i: i.priority_score, reverse=True)

    return items


def _score_item(item: PlannerItem, today: date, daily_available_minutes: int) -> None:
    override = item.priority_override_value

    if override is not None:
        item.priority_score = override
        item.is_manual_priority = True
        item.priority_level = priority_level_for_score(min(override, 1.0) if override <= 1 else 1.0)
        return

    if item.due_at is not None:
        days_left = max((item.due_at.date() - today).days, 0.1)
    else:
        days_left = 7.0

    remaining_minutes = item.estimated_minutes
    required_daily_pace = remaining_minutes / days_left

    urgency = 1 / days_left
    pace = required_daily_pace / max(daily_available_minutes, 1)

    if item.weight_percent is not None:
        weight = item.weight_percent / 100
    elif item.points is not None:
        weight = min(item.points, 100) / 100
    else:
        weight = 0.1

    # difficulty_component is centered on the "unset" default (3/5 = 0.6) so
    # an unrated item's boost is a no-op, rather than an implicit penalty.
    difficulty_component = (item.difficulty or 3) / 5

    # Timing (urgency + required pace) is the base signal - it alone decides
    # whether something belongs on today/this week's list at all. Weight and
    # difficulty then only *boost* that base score; they can't manufacture
    # priority for something with no timing pressure. This is what stops a
    # high-weight assignment with months of runway (near-zero urgency AND
    # near-zero pace, since the same amount of work is spread over a long
    # window) from outranking something genuinely due soon - previously
    # weight was summed in independently of how far away the deadline was.
    timing_score = W_URGENCY * min(urgency, 1.0) + W_PACE * min(pace, 1.0)
    importance_multiplier = 1.0 + min(weight, 1.0) * IMPORTANCE_BOOST
    difficulty_multiplier = 1.0 + (min(difficulty_component, 1.0) - 0.6) * DIFFICULTY_BOOST

    score = timing_score * importance_multiplier * difficulty_multiplier

    item.priority_score = score
    item.priority_level = priority_level_for_score(score)


def deterministic_why(item: PlannerItem, today: date, daily_available_minutes: int) -> str:
    if item.is_manual_priority:
        return "You set this as a manual priority."

    if item.is_overdue:
        return "This is overdue - it takes precedence over everything else."

    if item.due_at is not None:
        days_left = max((item.due_at.date() - today).days, 0)
        pace = item.estimated_minutes / max(days_left, 1)

        if pace >= daily_available_minutes * 0.6:
            return (
                f"Due in {days_left} day{'s' if days_left != 1 else ''} and needs "
                f"~{item.estimated_minutes} min - starting now keeps you at a "
                f"manageable pace."
            )

        weight_bit = f", worth {item.weight_percent:.0f}%" if item.weight_percent else ""
        return f"Due in {days_left} day{'s' if days_left != 1 else ''}{weight_bit}."

    return f"Estimated {item.estimated_minutes} minutes of work remaining."


def _commit_item_to_today(db: Session, item: PlannerItem, today: date) -> None:
    """Persist scheduled_date=today for an item newly picked into Today's
    plan, using the same field a manual "move to today" would set. Once
    committed, is_pinned_for_today() below treats it as due-today on every
    subsequent day until it's completed or manually rescheduled - this is
    what makes an unfinished item roll forward day after day instead of
    just re-competing for a slot from scratch."""
    if item.kind == "subtask":
        db.query(AssignmentSubtask).filter(AssignmentSubtask.id == item.subtask_id).update(
            {"scheduled_date": today}
        )
    else:
        db.query(Assignment).filter(Assignment.id == item.assignment_id).update(
            {"scheduled_date": today}
        )

    item.scheduled_date_override = today


def is_pinned_for_today(item: PlannerItem, today: date) -> bool:
    """A pin dated today or earlier counts as "due today" - a pin in the
    past means the item was committed to a prior day and never finished,
    i.e. it has rolled over."""
    return item.scheduled_date_override is not None and item.scheduled_date_override <= today


# How close a deadline has to be to belong on "today" regardless of its
# priority level - catches genuinely close due dates even when weight/pace
# didn't push the score into High/Critical.
DUE_SOON_DAYS_THRESHOLD = 2


def _should_be_done_today(item: PlannerItem, today: date) -> bool:
    """Whether an item belongs on today's list, based only on priority and
    how many days remain until it's due - no time-budget/capacity check.
    Today is meant to answer "what should I work on", not "what fits in N
    minutes"; Week/conflict detection are still where daily capacity is
    used to spot an overloaded schedule."""
    if item.due_at is not None:
        days_left = (item.due_at.date() - today).days
        if days_left <= DUE_SOON_DAYS_THRESHOLD:
            return True

    return item.priority_level in ("High", "Critical")


def build_today_plan(db: Session, user, semester_id: UUID | None = None) -> tuple[list[PlannerItem], int]:
    items = load_planner_items(db, user, semester_id)
    daily_available_minutes = get_planner_preference(db, user.id).daily_available_minutes
    today = current_wall_clock_time().date()

    pinned = [i for i in items if is_pinned_for_today(i, today)]
    overdue = [i for i in items if i.is_overdue and i not in pinned]
    rest = [i for i in items if i not in pinned and i not in overdue]

    selected: list[PlannerItem] = list(pinned) + list(overdue) + [
        i for i in rest if _should_be_done_today(i, today)
    ]

    # Freshly-picked (not already pinned/overdue) items are committed to
    # today so that if they're still incomplete tomorrow, is_pinned_for_today
    # guarantees them a slot again regardless of whether they'd still meet
    # the priority/due-soon bar on their own by then.
    newly_picked = [i for i in selected if i not in pinned and i not in overdue]

    if newly_picked:
        for item in newly_picked:
            _commit_item_to_today(db, item, today)
        db.commit()

    selected.sort(key=lambda i: i.priority_score, reverse=True)

    return selected, daily_available_minutes


def build_week_plan(db: Session, user, semester_id: UUID | None = None) -> tuple[list[tuple[date, list[PlannerItem]]], int]:
    items = load_planner_items(db, user, semester_id)
    daily_available_minutes = get_planner_preference(db, user.id).daily_available_minutes
    today = current_wall_clock_time().date()

    days = [today + timedelta(days=offset) for offset in range(7)]
    day_items: dict[date, list[PlannerItem]] = {d: [] for d in days}
    day_remaining: dict[date, int] = {d: daily_available_minutes for d in days}

    remaining_items = []

    for item in items:
        # A pin dated today or earlier (rolled over from a prior incomplete
        # day) lands on today's column, same rollover rule as Today's view -
        # it doesn't stay stuck on the day it was originally committed to.
        if item.scheduled_date_override is not None:
            pinned_date = today if item.scheduled_date_override <= today else item.scheduled_date_override
        else:
            pinned_date = None

        if pinned_date is not None and pinned_date in day_items:
            day_items[pinned_date].append(item)
            day_remaining[pinned_date] -= item.estimated_minutes
        else:
            remaining_items.append(item)

    for item in remaining_items:
        due_date = item.due_at.date() if item.due_at is not None else days[-1]
        window_end = min(due_date, days[-1]) if due_date >= days[0] else days[0]
        window = [d for d in days if d <= window_end] or [days[0]]

        # Chunk an oversized, un-subtasked item into day-sized virtual pieces
        # for display/allocation only - never persisted. Cycles through the
        # window as many times as needed (re-picking the day with the most
        # remaining capacity each pass) so every minute of estimated work
        # ends up somewhere, even on days already at or past capacity -
        # genuine over-capacity weeks are flagged separately by
        # detect_workload_conflicts, this loop's job is just to never drop
        # work.
        if item.kind == "assignment" and item.estimated_minutes > daily_available_minutes:
            remaining_minutes = item.estimated_minutes
            chunk_index = 1
            total_chunks = -(-item.estimated_minutes // daily_available_minutes)  # ceil div

            safety_limit = total_chunks + len(window) + 10

            while remaining_minutes > 0 and chunk_index <= safety_limit:
                d = max(window, key=lambda dd: day_remaining[dd])
                capacity = day_remaining[d]

                chunk_minutes = (
                    min(capacity, remaining_minutes, daily_available_minutes)
                    if capacity > 0
                    else min(remaining_minutes, daily_available_minutes)
                )

                if chunk_minutes <= 0:
                    break

                chunk = copy.copy(item)
                chunk.estimated_minutes = chunk_minutes
                chunk.raw_estimated_minutes = round(
                    item.raw_estimated_minutes * (chunk_minutes / item.estimated_minutes)
                )
                chunk.chunk_index = chunk_index
                chunk.chunk_label = f"part {chunk_index}/{total_chunks}"

                day_items[d].append(chunk)
                day_remaining[d] -= chunk_minutes
                remaining_minutes -= chunk_minutes
                chunk_index += 1

            continue

        best_day = max(window, key=lambda d: day_remaining[d])
        day_items[best_day].append(item)
        day_remaining[best_day] -= item.estimated_minutes

    for d in days:
        day_items[d].sort(key=lambda i: i.priority_score, reverse=True)

    return [(d, day_items[d]) for d in days], daily_available_minutes


def detect_workload_conflicts(db: Session, user, semester_id: UUID | None = None, horizon_days: int = 14):
    items = load_planner_items(db, user, semester_id)
    daily_available_minutes = get_planner_preference(db, user.id).daily_available_minutes
    today = current_wall_clock_time().date()
    horizon_end = today + timedelta(days=horizon_days)

    items_with_due = [i for i in items if i.due_at is not None and i.due_at.date() <= horizon_end]

    due_dates = sorted({i.due_at.date() for i in items_with_due})

    conflicts = []

    for as_of in due_dates:
        due_by_then = [i for i in items_with_due if i.due_at.date() <= as_of]
        required_minutes = sum(i.estimated_minutes for i in due_by_then)

        days_available = max((as_of - today).days + 1, 1)
        available_minutes = days_available * daily_available_minutes

        if required_minutes > available_minutes:
            contributing = sorted(due_by_then, key=lambda i: i.estimated_minutes, reverse=True)[:5]

            conflicts.append({
                "as_of_date": as_of,
                "deficit_minutes": required_minutes - available_minutes,
                "contributing_items": contributing,
            })

    return conflicts


def recommend_for_time_budget(db: Session, user, available_minutes: int, semester_id: UUID | None = None) -> list[PlannerItem]:
    items = [i for i in load_planner_items(db, user, semester_id) if i.estimated_minutes <= available_minutes]

    if not items:
        return []

    # Small 0/1 knapsack maximizing total priority_score within the minute
    # budget. Item counts are small (tens), so exact DP is cheap.
    n = len(items)
    capacity = available_minutes
    # Scale scores to integers for DP table stability.
    scaled_scores = [int(round(i.priority_score * 1000)) for i in items]

    dp = [[0] * (capacity + 1) for _ in range(n + 1)]

    for idx in range(1, n + 1):
        minutes = items[idx - 1].estimated_minutes
        score = scaled_scores[idx - 1]

        for cap in range(capacity + 1):
            dp[idx][cap] = dp[idx - 1][cap]

            if minutes <= cap:
                candidate = dp[idx - 1][cap - minutes] + score
                if candidate > dp[idx][cap]:
                    dp[idx][cap] = candidate

    selected: list[PlannerItem] = []
    cap = capacity

    for idx in range(n, 0, -1):
        if dp[idx][cap] != dp[idx - 1][cap]:
            item = items[idx - 1]
            selected.append(item)
            cap -= item.estimated_minutes

    selected.sort(key=lambda i: i.priority_score, reverse=True)

    return selected
