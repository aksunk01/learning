"""add grading categories and assignment score

Revision ID: c88e150cc555
Revises: b11a80992a17
Create Date: 2026-09-29 23:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'c88e150cc555'
down_revision: Union[str, Sequence[str], None] = 'b11a80992a17'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        "grading_categories",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("course_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("courses.id", ondelete="CASCADE"), nullable=False),
        sa.Column("material_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("course_materials.id", ondelete="SET NULL"), nullable=True),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("weight_percent", sa.Float(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index(op.f("ix_grading_categories_id"), "grading_categories", ["id"])
    op.create_index(op.f("ix_grading_categories_course_id"), "grading_categories", ["course_id"])
    op.create_index(op.f("ix_grading_categories_material_id"), "grading_categories", ["material_id"])

    op.add_column(
        "assignments",
        sa.Column("category_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("grading_categories.id", ondelete="SET NULL"), nullable=True),
    )
    op.create_index(op.f("ix_assignments_category_id"), "assignments", ["category_id"])
    op.add_column(
        "assignments",
        sa.Column("score_earned", sa.Float(), nullable=True),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column("assignments", "score_earned")
    op.drop_index(op.f("ix_assignments_category_id"), table_name="assignments")
    op.drop_column("assignments", "category_id")

    op.drop_index(op.f("ix_grading_categories_material_id"), table_name="grading_categories")
    op.drop_index(op.f("ix_grading_categories_course_id"), table_name="grading_categories")
    op.drop_index(op.f("ix_grading_categories_id"), table_name="grading_categories")
    op.drop_table("grading_categories")
