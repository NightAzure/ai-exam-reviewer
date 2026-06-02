"""
Document ingestion pipeline for RAG.

Downloads a file from Supabase Storage, extracts text, splits into
overlapping chunks, embeds each chunk, and stores the results in the
document_chunks table.  Updates course_documents.processing_status
throughout so the UI can show progress.

Triggered via POST /ai/ingest-document (FastAPI BackgroundTask).
"""

import asyncio
import io
from datetime import datetime, timezone
from typing import Any

from rag.embedding import EmbeddingModel

# 150 words ≈ 190–220 tokens — safe within all-MiniLM-L6-v2's 256-token limit
CHUNK_WORDS = 150
OVERLAP_WORDS = 20
EMBED_BATCH = 32


def _chunk_text(text: str) -> list[str]:
    words = text.split()
    if not words:
        return []
    chunks: list[str] = []
    start = 0
    while start < len(words):
        end = min(start + CHUNK_WORDS, len(words))
        chunks.append(" ".join(words[start:end]))
        if end == len(words):
            break
        start += CHUNK_WORDS - OVERLAP_WORDS
    return [c for c in chunks if c.strip()]


def _extract_text_pdf(data: bytes) -> str:
    try:
        import pypdf  # type: ignore[import-untyped]
    except ImportError as exc:
        raise RuntimeError("pypdf not installed — run: pip install pypdf") from exc

    reader = pypdf.PdfReader(io.BytesIO(data))
    pages = []
    for page in reader.pages:
        text = page.extract_text() or ""
        if text.strip():
            pages.append(text)
    return "\n\n".join(pages)


def _extract_text(data: bytes, mime_type: str) -> str:
    if mime_type == "application/pdf" or mime_type.endswith("/pdf"):
        return _extract_text_pdf(data)
    # Treat everything else as plain text
    return data.decode("utf-8", errors="replace")


class DocumentIngester:
    def __init__(self, supabase_client: Any, embedding_model: EmbeddingModel) -> None:
        self._supa = supabase_client
        self._emb = embedding_model

    def _set_status(self, document_id: int, status: str, *, processed: bool = False) -> None:
        update: dict[str, Any] = {"processing_status": status}
        if processed:
            update["processed_at"] = datetime.now(timezone.utc).isoformat()
        self._supa.table("course_documents").update(update).eq("id", document_id).execute()

    async def ingest(self, document_id: int, course_id: int) -> int:
        """
        Full ingest pipeline. Returns number of chunks stored.
        Sets processing_status on course_documents throughout.
        """
        loop = asyncio.get_event_loop()
        try:
            return await loop.run_in_executor(
                None, self._ingest_sync, document_id, course_id
            )
        except Exception as exc:
            print(f"[INGEST] document_id={document_id} FAILED: {exc}")
            try:
                self._set_status(document_id, "failed")
            except Exception:
                pass
            raise

    def _ingest_sync(self, document_id: int, course_id: int) -> int:
        # 1. Fetch document metadata
        row_result = (
            self._supa.table("course_documents")
            .select("storage_bucket, storage_path, mime_type, original_filename, course_id")
            .eq("id", document_id)
            .eq("course_id", course_id)
            .single()
            .execute()
        )
        doc = row_result.data
        if not doc:
            raise ValueError(
                f"course_documents row not found for document_id={document_id} course_id={course_id}"
            )

        print(f"[INGEST] Starting: id={document_id} file={doc['original_filename']}")
        self._set_status(document_id, "processing")

        # 2. Download bytes from Supabase Storage
        download_result = (
            self._supa.storage
            .from_(doc["storage_bucket"])
            .download(doc["storage_path"])
        )
        # supabase-py returns raw bytes from .download()
        data: bytes = download_result

        # 3. Extract text
        text = _extract_text(data, doc.get("mime_type", ""))
        if not text.strip():
            raise ValueError("No extractable text found in document")

        # 4. Chunk
        chunks = _chunk_text(text)
        print(f"[INGEST] {len(chunks)} chunks from {len(text)} chars")

        # 5. Embed in batches
        embeddings: list[list[float]] = []
        for i in range(0, len(chunks), EMBED_BATCH):
            batch = chunks[i : i + EMBED_BATCH]
            for chunk in batch:
                embeddings.append(self._emb.encode(chunk))

        # 6. Delete old chunks for this document (idempotent re-run)
        self._supa.table("document_chunks").delete().eq("document_id", document_id).eq("course_id", course_id).execute()

        # 7. Insert new chunks
        rows = [
            {
                "document_id": document_id,
                "course_id": course_id,
                "chunk_index": idx,
                "content": chunk,
                "embedding": emb,
            }
            for idx, (chunk, emb) in enumerate(zip(chunks, embeddings))
        ]
        # Insert in batches to avoid request size limits
        for i in range(0, len(rows), 100):
            self._supa.table("document_chunks").insert(rows[i : i + 100]).execute()

        # 8. Mark ready
        self._set_status(document_id, "ready", processed=True)
        print(f"[INGEST] Done: id={document_id} — {len(chunks)} chunks stored")
        return len(chunks)
