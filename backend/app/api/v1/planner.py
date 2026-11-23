from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.auth import get_current_user
from app.db.dependencies import get_db
from app.models.user import User
from app.schemas.planner import PlannerItemResponse, TodayPlanResponse
from app.services import planner_engine

router = APIRouter(
    prefix="/planner",
    tags=["Planner"]
)


def _to_item_response(item: planner_engine.PlannerItem) -> PlannerItemResponse:
    return PlannerItemResponse(
        assignment_id=item.assignment_id,
        course_id=item.course_id,
        course_name=item.course_name,
        title=item.title,
        assignment_type=item.assignment_type,
        due_at=item.due_at,
        is_overdue=item.is_overdue,
        score=item.score,
        estimated_minutes=item.estimated_minutes,
        reason=item.reason,
    )


@router.get("/today", response_model=TodayPlanResponse)
def get_today_plan(semester_id: UUID | None = None, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    focus_now, up_next = planner_engine.build_daily_plan(db, current_user, semester_id)

    return TodayPlanResponse(
        focus_now=[_to_item_response(i) for i in focus_now],
        up_next=[_to_item_response(i) for i in up_next],
    )
