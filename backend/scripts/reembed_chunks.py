"""Re-embed document chunks that were embedded with a different model.

Switching embedding providers (e.g. Gemini -> Ollama) changes the vector
space, even when the output dimension happens to match. Mixing old and new
embeddings in the same similarity search would silently return wrong
results, so this script finds every chunk whose stored `embedding_model`
doesn't match the model currently configured via OLLAMA_EMBEDDING_MODEL (or
has no embedding at all) and re-embeds it from its already-stored `content`
- no re-upload or re-chunking needed.

Safe to re-run: rows already on the current model are left untouched.

Usage:
    source .venv/bin/activate
    python scripts/reembed_chunks.py [--dry-run] [--batch-size 20]
"""
import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.core.config import settings
from app.db.database import SessionLocal
from app.models.document_chunk import DocumentChunk
from app.services.embedding import EMBEDDING_DIMENSION, EmbeddingError, EmbeddingService


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="List chunks that would be re-embedded without changing anything",
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=20,
        help="Commit after this many chunks (default: 20)",
    )
    args = parser.parse_args()

    target_model = settings.OLLAMA_EMBEDDING_MODEL
    db = SessionLocal()
    embedding_service = EmbeddingService()

    try:
        stale_chunks = (
            db.query(DocumentChunk)
            .filter(
                (DocumentChunk.embedding_model != target_model)
                | (DocumentChunk.embedding_model.is_(None))
                | (DocumentChunk.embedding.is_(None))
            )
            .all()
        )

        if not stale_chunks:
            print(f"Nothing to do - every chunk is already embedded with '{target_model}'.")
            return

        print(
            f"Found {len(stale_chunks)} chunk(s) not embedded with '{target_model}' "
            f"(target dimension: {EMBEDDING_DIMENSION})."
        )

        if args.dry_run:
            for chunk in stale_chunks:
                print(
                    f"  - chunk {chunk.id} (material {chunk.material_id}): "
                    f"currently embedding_model={chunk.embedding_model!r}"
                )
            print("Dry run - no changes made.")
            return

        succeeded = 0
        failed: list[tuple[str, str]] = []

        for index, chunk in enumerate(stale_chunks, start=1):
            title = chunk.material.file_name if chunk.material else "unknown"

            try:
                chunk.embedding = embedding_service.embed_document(
                    text=chunk.content,
                    title=title,
                )
                chunk.embedding_model = target_model
                chunk.embedding_dimension = EMBEDDING_DIMENSION
                succeeded += 1
            except EmbeddingError as e:
                failed.append((str(chunk.id), str(e)))
                print(f"  [{index}/{len(stale_chunks)}] FAILED chunk {chunk.id}: {e}")
                continue

            if index % args.batch_size == 0:
                db.commit()
                print(f"  [{index}/{len(stale_chunks)}] committed...")

        db.commit()

        print(f"\nDone. Re-embedded {succeeded}/{len(stale_chunks)} chunk(s) with '{target_model}'.")

        if failed:
            print(f"{len(failed)} chunk(s) failed and were left unchanged:")
            for chunk_id, error in failed:
                print(f"  - {chunk_id}: {error}")
            print("Re-run this script to retry the failed chunks.")

    finally:
        db.close()


if __name__ == "__main__":
    main()
