from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.auth import get_current_user
from app.api.v1.assignments import current_wall_clock_time
from app.db.dependencies import get_db
from app.models.assignment import Assignment
from app.models.assignment_subtask import AssignmentSubtask
from app.models.course import Course
from app.models.planner_preference import PlannerPreference
from app.models.task_time_log import TaskTimeLog
from app.models.user import User
from app.schemas.planner import (
    DayPlan,
    PlannerItemResponse,
    PlannerPreferenceResponse,
    PlannerPreferenceUpdate,
    RecommendRequest,
    RecommendResponse,
    TaskTimeLogCreate,
    TaskTimeLogResponse,
    TodayPlanResponse,
    WeekPlanResponse,
    WorkloadConflictResponse,
)
from app.services import planner_engine
from app.services.planner_ai import PlannerAIService

router = APIRouter(
    prefix="/planner",
    tags=["Planner"]
)


def _to_item_response(item: planner_engine.PlannerItem, today: date, daily_available_minutes: int, why_overrides: dict[str, str] | None = None) -> PlannerItemResponse:
    why = None
    if why_overrides is not None:
        why = why_overrides.get(item.item_id)
    if why is None:
        why = planner_engine.deterministic_why(item, today, daily_available_minutes)

    return PlannerItemResponse(
        kind=item.kind,
        assignment_id=item.assignment_id,
        subtask_id=item.subtask_id,
        course_id=item.course_id,
        course_name=item.course_name,
        title=item.title,
        assignment_type=item.assignment_type,
        due_at=item.due_at,
        estimated_minutes=item.estimated_minutes,
        raw_estimated_minutes=item.raw_estimated_minutes,
        weight_percent=item.weight_percent,
        points=item.points,
        difficulty=item.difficulty,
        priority_score=item.priority_score,
        priority_level=item.priority_level,
        is_overdue=item.is_overdue,
        is_manual_priority=item.is_manual_priority,
        chunk_label=item.chunk_label,
        why=why,
    )


def _explanations_for(items: list[planner_engine.PlannerItem], today: date) -> dict[str, str]:
    """Best-effort LLM explanations for a list of items. Never raises -
    callers get an empty dict (falling back to deterministic text) on any
    failure (quota exhausted, network error, bad JSON, etc)."""
    if not items:
        return {}

    try:
        service = PlannerAIService()
        context = [
            {
                "item_id": item.item_id,
                "title": item.title,
                "course_name": item.course_name,
                "due_in_days": (item.due_at.date() - today).days if item.due_at else None,
                "estimated_minutes": item.estimated_minutes,
                "weight_percent": item.weight_percent,
                "priority_level": item.priority_level,
            }
            for item in items
        ]
        return service.explain_selections(context)
    except Exception:
        return {}


@router.get("/today", response_model=TodayPlanResponse)
def get_today_plan(semester_id: UUID | None = None, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    items, daily_available_minutes = planner_engine.build_today_plan(db, current_user, semester_id)
    today = current_wall_clock_time().date()

    why_overrides = _explanations_for(items, today)

    return TodayPlanResponse(
        items=[_to_item_response(i, today, daily_available_minutes, why_overrides) for i in items],
        daily_available_minutes=daily_available_minutes,
    )


@router.get("/week", response_model=WeekPlanResponse)
def get_week_plan(semester_id: UUID | None = None, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    days, daily_available_minutes = planner_engine.build_week_plan(db, current_user, semester_id)
    today = current_wall_clock_time().date()

    all_items = [item for _, items in days for item in items]
    why_overrides = _explanations_for(all_items, today)

    return WeekPlanResponse(
        days=[
            DayPlan(
                date=d,
                items=[_to_item_response(i, today, daily_available_minutes, why_overrides) for i in items],
            )
            for d, items in days
        ],
        daily_available_minutes=daily_available_minutes,
    )


@router.get("/conflicts", response_model=list[WorkloadConflictResponse])
def get_workload_conflicts(semester_id: UUID | None = None, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    conflicts = planner_engine.detect_workload_conflicts(db, current_user, semester_id)
    today = current_wall_clock_time().date()
    daily_available_minutes = planner_engine.get_planner_preference(db, current_user.id).daily_available_minutes

    return [
        WorkloadConflictResponse(
            as_of_date=c["as_of_date"],
            deficit_minutes=c["deficit_minutes"],
            contributing_items=[
                _to_item_response(i, today, daily_available_minutes)
                for i in c["contributing_items"]
            ],
        )
        for c in conflicts
    ]


@router.post("/recommend", response_model=RecommendResponse)
def recommend(request: RecommendRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    items = planner_engine.recommend_for_time_budget(
        db, current_user, request.available_minutes, request.semester_id
    )
    today = current_wall_clock_time().date()
    daily_available_minutes = planner_engine.get_planner_preference(db, current_user.id).daily_available_minutes

    if not items:
        return RecommendResponse(
            items=[],
            explanation="Nothing fits in that amount of time right now - try a longer session, or check back after breaking a task into smaller subtasks.",
        )

    explanation = None
    try:
        service = PlannerAIService()
        context = [
            {
                "title": item.title,
                "course_name": item.course_name,
                "due_in_days": (item.due_at.date() - today).days if item.due_at else None,
                "estimated_minutes": item.estimated_minutes,
                "priority_level": item.priority_level,
            }
            for item in items
        ]
        explanation = service.phrase_recommendation(context, request.available_minutes)
    except Exception:
        pass

    if explanation is None:
        titles = ", ".join(f'"{i.title}"' for i in items)
        explanation = f"With {request.available_minutes} minutes, focus on: {titles}."

    return RecommendResponse(
        items=[_to_item_response(i, today, daily_available_minutes) for i in items],
        explanation=explanation,
    )


@router.get("/preferences", response_model=PlannerPreferenceResponse)
def get_preferences(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    pref = planner_engine.get_planner_preference(db, current_user.id)
    return PlannerPreferenceResponse(daily_available_minutes=pref.daily_available_minutes)


@router.patch("/preferences", response_model=PlannerPreferenceResponse)
def update_preferences(update: PlannerPreferenceUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    pref = planner_engine.get_planner_preference(db, current_user.id)

    if update.daily_available_minutes is not None:
        pref.daily_available_minutes = update.daily_available_minutes

    db.commit()
    db.refresh(pref)

    return PlannerPreferenceResponse(daily_available_minutes=pref.daily_available_minutes)


@router.post("/time-logs", response_model=TaskTimeLogResponse, status_code=status.HTTP_201_CREATED)
def create_time_log(log_data: TaskTimeLogCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if bool(log_data.assignment_id) == bool(log_data.subtask_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Exactly one of assignment_id or subtask_id must be provided",
        )

    assignment = None
    subtask = None

    if log_data.subtask_id is not None:
        subtask = (
            db.query(AssignmentSubtask)
            .join(Assignment, AssignmentSubtask.assignment_id == Assignment.id)
            .join(Course, Assignment.course_id == Course.id)
            .filter(
                AssignmentSubtask.id == log_data.subtask_id,
                Course.user_id == current_user.id,
            )
            .first()
        )

        if subtask is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subtask not found")

        assignment = subtask.assignment
    else:
        assignment = (
            db.query(Assignment)
            .join(Course, Assignment.course_id == Course.id)
            .filter(
                Assignment.id == log_data.assignment_id,
                Course.user_id == current_user.id,
            )
            .first()
        )

        if assignment is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found")

    estimated_minutes = subtask.estimated_minutes if subtask is not None else assignment.estimated_minutes

    log = TaskTimeLog(
        user_id=current_user.id,
        assignment_id=assignment.id,
        subtask_id=subtask.id if subtask is not None else None,
        course_id=assignment.course_id,
        assignment_type=assignment.assignment_type,
        estimated_minutes=estimated_minutes,
        actual_minutes=log_data.actual_minutes,
    )

    db.add(log)
    db.commit()
    db.refresh(log)

    return log
