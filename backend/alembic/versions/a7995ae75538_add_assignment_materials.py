"""add assignment materials

Revision ID: a7995ae75538
Revises: d149eeeeaefb
Create Date: 2026-08-30 22:44:51.549999

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'a7995ae75538'
down_revision: Union[str, Sequence[str], None] = 'd149eeeeaefb'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    op.create_table(
        "assignment_materials",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("assignment_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("material_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "relationship_type",
            sa.String(length=50),
            server_default="reference",
            nullable=False,
        ),
        sa.Column(
            "is_primary",
            sa.Boolean(),
            server_default=sa.false(),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["assignment_id"],
            ["assignments.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["material_id"],
            ["course_materials.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "assignment_id",
            "material_id",
            name="uq_assignment_material_assignment_material",
        ),
    )

    op.create_index(
        op.f("ix_assignment_materials_id"),
        "assignment_materials",
        ["id"],
        unique=False,
    )

    op.create_index(
        op.f("ix_assignment_materials_assignment_id"),
        "assignment_materials",
        ["assignment_id"],
        unique=False,
    )

    op.create_index(
        op.f("ix_assignment_materials_material_id"),
        "assignment_materials",
        ["material_id"],
        unique=False,
    )

    op.create_index(
        "uq_assignment_materials_primary_assignment",
        "assignment_materials",
        ["assignment_id"],
        unique=True,
        postgresql_where=sa.text("is_primary = true"),
    )


def downgrade() -> None:
    op.drop_index(
        "uq_assignment_materials_primary_assignment",
        table_name="assignment_materials",
    )

    op.drop_index(
        op.f("ix_assignment_materials_material_id"),
        table_name="assignment_materials",
    )

    op.drop_index(
        op.f("ix_assignment_materials_assignment_id"),
        table_name="assignment_materials",
    )

    op.drop_index(
        op.f("ix_assignment_materials_id"),
        table_name="assignment_materials",
    )

    op.drop_table("assignment_materials")
