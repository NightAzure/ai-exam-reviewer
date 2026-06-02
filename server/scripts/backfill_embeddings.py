#!/usr/bin/env python3
"""
One-time backfill: generate and store embeddings for all existing question_bank rows.

Run after applying migration 20260518000100_add_question_embeddings.sql:

    cd server
    python -m scripts.backfill_embeddings

Skips rows that already have an embedding (safe to re-run after partial failures).
Progress is printed every batch. Expects the same env vars as the main server.
"""

import sys
import time
from pathlib import Path

# Ensure server/ is on the path when run as a module
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from config import get_settings
from rag.embedding import EmbeddingModel

try:
    from supabase import create_client
except ImportError:
    print("ERROR: supabase package not installed. Run: pip install supabase")
    sys.exit(1)

BATCH_SIZE = 100


def build_text(row: dict) -> str:
    """Concatenate all searchable fields into one string for embedding."""
    parts = [row.get("question", "")]
    for letter in ("a", "b", "c", "d", "e"):
        val = (row.get(f"choice_{letter}") or "").strip()
        if val:
            parts.append(val)
    if row.get("correct_answer"):
        parts.append(f"Answer: {row['correct_answer']}")
    if row.get("explanation"):
        parts.append(row["explanation"])
    if row.get("topic"):
        parts.append(row["topic"])
    if row.get("subject"):
        parts.append(row["subject"])
    return " | ".join(p for p in parts if p)


def main() -> None:
    cfg = get_settings()

    if not cfg.supabase_configured:
        print("ERROR: SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY must be set.")
        sys.exit(1)

    print(f"[BACKFILL] Connecting to Supabase: {cfg.supabase_url_effective[:40]}...")
    supa = create_client(cfg.supabase_url_effective, cfg.supabase_service_role_key)

    print(f"[BACKFILL] Loading embedding model: {cfg.embedding_model}")
    model = EmbeddingModel(cfg.embedding_model)

    # Count rows needing embeddings
    count_result = (
        supa.table("question_bank")
        .select("id", count="exact")
        .is_("embedding", "null")
        .execute()
    )
    total = count_result.count or 0
    print(f"[BACKFILL] {total} questions need embeddings")

    if total == 0:
        print("[BACKFILL] Nothing to do — all questions already have embeddings.")
        return

    processed = 0
    errors = 0
    start_all = time.time()
    offset = 0

    while True:
        rows_result = (
            supa.table("question_bank")
            .select(
                "id, question, choice_a, choice_b, choice_c, choice_d, choice_e, "
                "correct_answer, explanation, topic, subject"
            )
            .is_("embedding", "null")
            .range(offset, offset + BATCH_SIZE - 1)
            .execute()
        )
        batch = rows_result.data or []
        if not batch:
            break

        for row in batch:
            text = build_text(row)
            if not text.strip():
                print(f"  [SKIP] id={row['id']} — no text to embed")
                continue
            try:
                embedding = model.encode(text)
                supa.table("question_bank").update({"embedding": embedding}).eq("id", row["id"]).execute()
                processed += 1
            except Exception as exc:
                print(f"  [ERROR] id={row['id']}: {exc}")
                errors += 1

        offset += len(batch)
        elapsed = time.time() - start_all
        rate = processed / elapsed if elapsed > 0 else 0
        remaining = (total - processed - errors)
        eta = remaining / rate if rate > 0 else 0
        print(
            f"[BACKFILL] {processed}/{total} done | {errors} errors | "
            f"{rate:.1f} q/s | ETA {eta:.0f}s"
        )

    print(
        f"\n[BACKFILL] Complete — {processed} embedded, {errors} errors, "
        f"{time.time() - start_all:.1f}s total"
    )


if __name__ == "__main__":
    main()
