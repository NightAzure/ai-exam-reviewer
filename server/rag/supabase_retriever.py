"""
Supabase pgvector retriever.

Searches both question_bank (exam questions) and document_chunks (uploaded
course materials) in parallel using pgvector HNSW similarity search.

No local files, no SQLite, fully stateless.
"""

import asyncio
from typing import Any

from rag.base import RetrieverProtocol
from rag.embedding import EmbeddingModel


class SupabaseVectorRetriever:
    """Implements RetrieverProtocol using Supabase pgvector."""

    def __init__(self, supabase_client: Any, embedding_model: EmbeddingModel) -> None:
        self._supa = supabase_client
        self.embedding_model = embedding_model  # exposed for DocumentIngester

    async def retrieve(
        self,
        query: str,
        k: int = 5,
        course_id: int | None = None,
    ) -> list[dict]:
        if not query or not query.strip() or self._supa is None:
            return []

        loop = asyncio.get_event_loop()

        # Embed query once; reuse for both RPC calls
        embedding: list[float] = await loop.run_in_executor(
            None, self.embedding_model.encode, query.strip()
        )

        start = loop.time()
        questions_task = asyncio.create_task(
            self._match_questions(loop, embedding, k, course_id)
        )
        docs_task = asyncio.create_task(
            self._match_document_chunks(loop, embedding, k, course_id)
        )
        questions, doc_chunks = await asyncio.gather(
            questions_task, docs_task, return_exceptions=True
        )

        results: list[dict] = []
        if not isinstance(questions, Exception):
            results.extend(questions)
        else:
            print(f"[RAG] match_questions failed: {questions}")

        if not isinstance(doc_chunks, Exception):
            results.extend(doc_chunks)
        else:
            print(f"[RAG] match_document_chunks failed: {doc_chunks}")

        elapsed_ms = (loop.time() - start) * 1000
        if results:
            print(f"[RAG] {len(results)} results ({len(questions) if not isinstance(questions, Exception) else 0}q + {len(doc_chunks) if not isinstance(doc_chunks, Exception) else 0}d) in {elapsed_ms:.1f}ms")
        return results

    async def _match_questions(
        self, loop: asyncio.AbstractEventLoop, embedding: list[float], k: int, course_id: int | None
    ) -> list[dict]:
        def _rpc() -> list[dict]:
            result = self._supa.rpc(
                "match_questions",
                {
                    "query_embedding": embedding,
                    "match_count": max(1, min(20, k)),
                    "p_course_id": course_id,
                },
            ).execute()
            return result.data or []

        rows = await loop.run_in_executor(None, _rpc)
        return [{"_source": "question", **r} for r in rows]

    async def _match_document_chunks(
        self, loop: asyncio.AbstractEventLoop, embedding: list[float], k: int, course_id: int | None
    ) -> list[dict]:
        def _rpc() -> list[dict]:
            result = self._supa.rpc(
                "match_document_chunks",
                {
                    "query_embedding": embedding,
                    "match_count": max(1, min(20, k)),
                    "p_course_id": course_id,
                },
            ).execute()
            return result.data or []

        rows = await loop.run_in_executor(None, _rpc)
        return [{"_source": "document", **r} for r in rows]

    def format_context(self, results: list[dict]) -> str:
        """Convert retrieve() rows into a prompt-ready context block."""
        if not results:
            return ""

        questions = [r for r in results if r.get("_source") != "document"]
        doc_chunks = [r for r in results if r.get("_source") == "document"]

        parts: list[str] = []

        if questions:
            lines = ["Here are similar problems from the question bank:\n"]
            for i, r in enumerate(questions, 1):
                subject = r.get("subject", "")
                topic = r.get("topic", "")
                label = f"{subject} / {topic}" if subject or topic else "General"
                lines.append(f"\nExample {i} ({label}):")
                lines.append(f"Q: {r.get('question', '')}")
                lines.append(f"Answer: {r.get('correct_answer', '')}")
                if r.get("explanation"):
                    lines.append(f"Explanation: {r['explanation']}")
            parts.append("\n".join(lines))

        if doc_chunks:
            lines = ["Here are relevant excerpts from course documents:\n"]
            for i, r in enumerate(doc_chunks, 1):
                lines.append(f"\nExcerpt {i}:")
                lines.append(r.get("content", ""))
            parts.append("\n".join(lines))

        return "\n\n".join(parts)
