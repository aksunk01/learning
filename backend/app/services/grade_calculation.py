from uuid import UUID

from sqlalchemy.orm import Session

from app.models.assignment import Assignment
from app.models.grading_category import GradingCategory
from app.schemas.grading_category import CategoryGradeResponse, CourseGradeResponse


def compute_course_grade(db: Session, course_id: UUID) -> CourseGradeResponse:
    categories = (
        db.query(GradingCategory)
        .filter(GradingCategory.course_id == course_id)
        .all()
    )

    assignments = (
        db.query(Assignment)
        .filter(Assignment.course_id == course_id)
        .all()
    )

    assignments_by_category: dict[UUID, list[Assignment]] = {}

    for assignment in assignments:
        if assignment.category_id is not None:
            assignments_by_category.setdefault(assignment.category_id, []).append(assignment)

    category_grades: list[CategoryGradeResponse] = []

    for category in categories:
        category_assignments = assignments_by_category.get(category.id, [])

        graded_assignments = [
            assignment
            for assignment in category_assignments
            if assignment.score_earned is not None and assignment.points is not None
        ]

        points_earned = sum(assignment.score_earned for assignment in graded_assignments)
        points_possible = sum(assignment.points for assignment in graded_assignments)

        percent = (
            points_earned / points_possible * 100
            if points_possible > 0
            else None
        )

        category_grades.append(
            CategoryGradeResponse(
                id=category.id,
                name=category.name,
                weight_percent=category.weight_percent,
                percent=percent,
                points_earned=points_earned,
                points_possible=points_possible,
                graded_count=len(graded_assignments),
                total_count=len(category_assignments)
            )
        )

    # Only categories with at least one graded assignment count toward the
    # running grade, renormalized against each other - otherwise an
    # as-yet-ungraded category (e.g. "Final Exam") would drag the average
    # down before any work in it has been graded.
    graded_categories = [
        category
        for category in category_grades
        if category.percent is not None
    ]

    weight_sum_graded = sum(category.weight_percent for category in graded_categories)

    overall_percent = (
        sum(category.percent * category.weight_percent for category in graded_categories) / weight_sum_graded
        if weight_sum_graded > 0
        else None
    )

    uncategorized_graded_count = sum(
        1
        for assignment in assignments
        if assignment.category_id is None and assignment.score_earned is not None
    )

    return CourseGradeResponse(
        overall_percent=overall_percent,
        weight_sum=sum(category.weight_percent for category in categories),
        categories=category_grades,
        uncategorized_graded_count=uncategorized_graded_count
    )
