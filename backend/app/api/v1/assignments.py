from uuid import UUID
from datetime import datetime, timezone, time, date
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, relationship, selectinload
from sqlalchemy import func

from app.api.auth import get_current_user
from app.db.dependencies import get_db
from app.models.assignment import Assignment
from app.models.assignment_material import AssignmentMaterial
from app.models.course import Course
from app.models.course_material import CourseMaterial
from app.models.user import User
from app.schemas.assignment import (
    AssignmentResponse, 
    AssignmentCreate, 
    AssignmentCompletionUpdate, 
    AssignmentDetailResponse,
    AssignmentMaterialResponse,
    AssignmentMaterialsLinkRequest,
    AssignmentMaterialUpdate
)



EASTERN_TIME = ZoneInfo("America/New_York")

router = APIRouter(
    prefix="/courses/{course_id}/assignments",
    tags=["Assignments"]
)

all_assignments_router = APIRouter(
    prefix="/assignments",
    tags=["Assignments"]
)

def query_upcoming_assignments(db: Session, user_id: UUID, limit: int | None = None) -> list[Assignment]:
    now = datetime.now(timezone.utc)

    query = (
        db.query(Assignment)
        .join(
            Course,
            Assignment.course_id == Course.id
        )
        .filter(
            Course.user_id == user_id,
            Assignment.due_at >= now,
            Assignment.is_completed == False
        )
        .order_by(
            Assignment.due_at.asc()
        )
    )

    if limit is not None:
        query = query.limit(limit)

    return query.all()

def query_overdue_assignments(db: Session, user_id: UUID)-> list[Assignment]:
    now = datetime.now(timezone.utc)

    return(
        db.query(Assignment)
        .join(
            Course,
            Assignment.course_id == Course.id
        )
        .filter(
            Course.user_id ==user_id,
            Assignment.due_at < now,
            Assignment.is_completed == False
        )
        .order_by(
            Assignment.due_at.desc()
        )
        .all()
    )

def query_next_exam(db: Session, user_id: UUID) -> Assignment | None:
    now = datetime.now(timezone.utc)

    return(
        db.query(Assignment)
        .join(
            Course,
            Assignment.course_id == Course.id
        )
        .filter(
            Course.user_id == user_id,
            Assignment.due_at >= now,
            Assignment.assignment_type == "exam",
            Assignment.is_completed == False
        )
        .order_by(
            Assignment.due_at.asc()
        )
        .first()
    )

def query_next_project(db: Session, user_id: UUID) -> Assignment | None:
    now = datetime.now(timezone.utc)

    return(
        db.query(Assignment)
        .join(
            Course,
            Assignment.course_id == Course.id
        )
        .filter(
            Course.user_id == user_id,
            Assignment.due_at >= now,
            Assignment.assignment_type == "project",
            Assignment.is_completed == False
        )
        .order_by(
            Assignment.due_at.asc()
        )
        .first()
    )

def query_assignments_in_range(db: Session, user_id: UUID, start_at: datetime | None = None, end_at: datetime | None = None, course_id: UUID | None = None) -> list[Assignment]:
    query = (
        db.query(Assignment)
        .join(
            Course,
            Assignment.course_id == Course.id
        )
        .filter(
            Course.user_id == user_id,
            Assignment.is_completed == False
        )
    )

    if course_id is not None:
        query = query.filter(
            Assignment.course_id == course_id
        )

    if start_at is not None:
        query = query.filter(
            Assignment.due_at >= start_at
        )

    if end_at is not None:
        query = query.filter(
            Assignment.due_at <= end_at
        )

    return(
        query
        .order_by(
            Assignment.due_at.asc().nullslast()
        )
        .all()

    )

def query_upcoming_assignment_count(db: Session, user_id: UUID) -> int:
    now = datetime.now(timezone.utc)

    return(
        db.query(func.count(Assignment.id))
        .join(
            Course,
            Assignment.course_id == Course.id
        )
        .filter(
            Course.user_id == user_id,
            Assignment.due_at >= now,
            Assignment.is_completed == False
        )
        .scalar()
    )

def query_upcoming_counts_by_course(db: Session, user_id: UUID):
    now = datetime.now(timezone.utc)

    return(
        db.query(
            Course.id.label("course_id"),
            Course.name.label("course_name"),
            Course.code.label("course_code"),
            func.count(Assignment.id).label("count")
        )
        .join(
            Assignment,
            Assignment.course_id == Course.id
        )
        .filter(
            Course.user_id == user_id,
            Assignment.due_at >= now,
            Assignment.is_completed == False
        )
        .group_by(
            Course.id,
            Course.name,
            Course.code
        )
        .order_by(
            Course.name.asc()
        )
        .all()
    )

@router.get("", response_model=list[AssignmentResponse])
def get_course_assignments(course_id: UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    course = (
        db.query(Course)
        .filter(
            Course.id == course_id,
            Course.user_id == current_user.id
        )
        .first()
    )

    if course is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found"
        )

    assignments = (
        db.query(Assignment)
        .filter(
            Assignment.course_id == course_id
        )
        .order_by(
            Assignment.due_at.asc().nullslast()
        )
        .all()
    )

    return assignments


@router.post("", response_model=AssignmentResponse, status_code=status.HTTP_201_CREATED)
def create_assignment(
    course_id: UUID,
    assignment_data: AssignmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Verify course exists and belongs to current user
    course = (
        db.query(Course)
        .filter(
            Course.id == course_id,
            Course.user_id == current_user.id
        )
        .first()
    )

    if course is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found"
        )

    # Create the assignment
    assignment = Assignment(
        course_id=course_id,
        **assignment_data.model_dump(exclude_unset=True)
    )
    
    db.add(assignment)
    db.commit()
    db.refresh(assignment)
    
    return assignment



@all_assignments_router.get("", response_model=list[AssignmentResponse])
def get_all_assignments(course_id: UUID | None = None, start: date | None = None, end: date | None = None, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    start_at = None
    end_at = None

    if start is not None:
        start_local = datetime.combine(
            start,
            time.min,
            tzinfo=EASTERN_TIME
        )
        start_at = start_local.astimezone(timezone.utc)

    if end is not None:
        end_local = datetime.combine(
            end,
            time.max,
            tzinfo=EASTERN_TIME
        )
        end_at = end_local.astimezone(timezone.utc)

    return query_assignments_in_range(
        db = db,
        user_id=current_user.id,
        start_at=start_at,
        end_at=end_at,
        course_id=course_id
    )


@all_assignments_router.get("/upcoming", response_model=list[AssignmentResponse])
def get_upcoming_assignments(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return query_upcoming_assignments(
        db = db,
        user_id=current_user.id
    )

@all_assignments_router.get("/overdue", response_model=list[AssignmentResponse])
def get_overdue_assignment(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return query_overdue_assignments(
        db=db,
        user_id=current_user.id
    )


def query_completed_assignments(db: Session, user_id: UUID, limit: int = 20) -> list[Assignment]:
    """Query completed assignments for a user, ordered by completion date descending."""
    return (
        db.query(Assignment)
        .join(
            Course,
            Assignment.course_id == Course.id
        )
        .filter(
            Course.user_id == user_id,
            Assignment.is_completed == True
        )
        .order_by(
            Assignment.completed_at.desc().nullslast()
        )
        .limit(limit)
        .all()
    )

@all_assignments_router.delete("/{assignment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_assignment(assignment_id: UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):

    assignment = (
        db.query(Assignment)
        .join(
            Course,
            Assignment.course_id == Course.id
        )
        .filter(
            Assignment.id == assignment_id,
            Course.user_id == current_user.id
        )
        .first()
    )

    if assignment is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assignment not found"
        )

    db.delete(assignment)
    db.commit()

    return None


@all_assignments_router.patch("/{assignment_id}/completion", response_model=AssignmentResponse)
def update_assignment_completion(
    assignment_id: UUID,
    completion_data: AssignmentCompletionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    assignment = (
        db.query(Assignment)
        .join(
            Course,
            Assignment.course_id == Course.id
        )
        .filter(
            Assignment.id == assignment_id,
            Course.user_id == current_user.id
        )
        .first()
    )

    if assignment is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assignment not found"
        )

    assignment.is_completed = completion_data.is_completed
    
    if completion_data.is_completed:
        assignment.completed_at = datetime.now(timezone.utc)
    else:
        assignment.completed_at = None

    db.commit()
    db.refresh(assignment)
    
    return assignment


# New endpoint for assignment detail
@all_assignments_router.get("/{assignment_id}", response_model=AssignmentDetailResponse)
def get_assignment_detail(
    assignment_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    "Get an assignment detail by ID including linked materials"

    # Get the assignment with joined course and materials
    assignment = (
        db.query(Assignment)
        .join(Course)
        .filter(
            Assignment.id == assignment_id,
            Course.user_id == current_user.id
        )
        .options(
            selectinload(Assignment.assignment_materials)
            .selectinload(AssignmentMaterial.material)
        )
        .first()
    )

    if not assignment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assignment not found"
        )

    # Return the assignment with linked materials
    return assignment


# New endpoint for linking course materials to an assignment
@all_assignments_router.post("/{assignment_id}/materials", response_model=list[AssignmentMaterialResponse])
def link_assignment_materials(
    assignment_id: UUID,
    link_request: AssignmentMaterialsLinkRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    "Link existing course materials to an assignment"

    # Get the assignment with joined course to verify ownership
    assignment = (
        db.query(Assignment)
        .join(Course)
        .filter(
            Assignment.id == assignment_id,
            Course.user_id == current_user.id
        )
        .first()
    )

    if not assignment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assignment not found"
        )

    # Verify all requested materials belong to the same course as the assignment
    course_id = assignment.course_id
    
    # Check for duplicate material IDs within the request itself
    material_ids = [link.material_id for link in link_request.materials]
    if len(material_ids) != len(set(material_ids)):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Duplicate material IDs found in request"
        )
    
    # Check if any material is already linked to this assignment
    existing_links = (
        db.query(AssignmentMaterial)
        .filter(
            AssignmentMaterial.assignment_id == assignment_id,
            AssignmentMaterial.material_id.in_(material_ids)
        )
        .all()
    )
    
    if existing_links:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Some materials are already linked to this assignment"
        )
    
    # Check that all materials belong to the same course as the assignment
    materials = (
        db.query(CourseMaterial)
        .filter(
            CourseMaterial.id.in_(material_ids),
            CourseMaterial.course_id == course_id
        )
        .all()
    )
    
    if len(materials) != len(material_ids):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="One or more materials do not belong to the assignment's course"
        )
    
    # Check if more than one material has is_primary=true
    primary_materials = [link for link in link_request.materials if link.is_primary]
    if len(primary_materials) > 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only one material can be marked as primary"
        )
    
    # If there's a new primary material, unset any existing primary link for this assignment
    if primary_materials:
        db.query(AssignmentMaterial)\
          .filter(AssignmentMaterial.assignment_id == assignment_id)\
          .update({"is_primary": False})
    
    # Create the new assignment-material links
    new_links = []
    for material_link in link_request.materials:
        link = AssignmentMaterial(
            assignment_id=assignment_id,
            material_id=material_link.material_id,
            relationship_type=material_link.relationship_type,
            is_primary=material_link.is_primary
        )
        db.add(link)
        new_links.append(link)
    
    db.commit()
    
    # Reload the created links with material data for proper response serialization
    if new_links:
        reloaded_links = (
            db.query(AssignmentMaterial)
            .options(selectinload(AssignmentMaterial.material))
            .filter(AssignmentMaterial.id.in_([link.id for link in new_links]))
            .all()
        )
        return reloaded_links
    
    # Return the created links
    return new_links


# New endpoint for updating an assignment-material link
@all_assignments_router.patch("/{assignment_id}/materials/{material_id}", response_model=AssignmentMaterialResponse)
def update_assignment_material(
    assignment_id: UUID,
    material_id: UUID,
    update_data: AssignmentMaterialUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    "Update an existing assignment-material link"

    # Get the assignment with joined course to verify ownership
    assignment = (
        db.query(Assignment)
        .join(Course)
        .filter(
            Assignment.id == assignment_id,
            Course.user_id == current_user.id
        )
        .first()
    )

    if not assignment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assignment not found"
        )

    # Find the specific link to update
    link = (
        db.query(AssignmentMaterial)
        .filter(
            AssignmentMaterial.assignment_id == assignment_id,
            AssignmentMaterial.material_id == material_id
        )
        .first()
    )

    if not link:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assignment-material link not found"
        )

    # Update the link with provided data
    if update_data.relationship_type is not None:
        link.relationship_type = update_data.relationship_type
    
    if update_data.is_primary is not None:
        # If setting as primary, unset any other primary links for this assignment
        if update_data.is_primary:
            db.query(AssignmentMaterial)\
              .filter(AssignmentMaterial.assignment_id == assignment_id)\
              .update({"is_primary": False})

            db.flush()
        
        link.is_primary = update_data.is_primary

    db.commit()
    db.refresh(link)
    
    # Reload the link with material data for proper response serialization
    reloaded_link = (
        db.query(AssignmentMaterial)
        .options(selectinload(AssignmentMaterial.material))
        .filter(AssignmentMaterial.id == link.id)
        .first()
    )
    
    return reloaded_link


@all_assignments_router.delete("/{assignment_id}/materials/{material_id}", status_code=status.HTTP_204_NO_CONTENT)
def unlink_assignment_material(assignment_id: UUID, material_id: UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    "Unlink an existing assignment-material relationship"

    assignment = (
        db.query(Assignment)
        .join(Course)
        .filter(
            Assignment.id == assignment_id,
            Course.user_id == current_user.id
        )
        .first()
    )

    if not assignment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assignment not found"
        )

    link = (
        db.query(AssignmentMaterial)
        .filter(
            AssignmentMaterial.assignment_id == assignment_id,
            AssignmentMaterial.material_id == material_id
        )
        .first()
    )

    if not link:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assignment-material link not found"
        )

    db.delete(link)
    db.commit()

    return None