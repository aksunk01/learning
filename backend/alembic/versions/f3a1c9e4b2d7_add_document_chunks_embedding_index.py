"""add hnsw index on document_chunks.embedding

Revision ID: f3a1c9e4b2d7
Revises: a7995ae75538
Create Date: 2026-09-23 18:00:00

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = 'f3a1c9e4b2d7'
down_revision: Union[str, Sequence[str], None] = 'a7995ae75538'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # RetrievalService queries with .cosine_distance(), so the index must use
    # vector_cosine_ops to actually be used by the planner. Without this index,
    # every RAG query does a full sequential scan over document_chunks.
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_document_chunks_embedding_hnsw "
        "ON document_chunks USING hnsw (embedding vector_cosine_ops)"
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_document_chunks_embedding_hnsw")
