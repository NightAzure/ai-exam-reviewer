"""Retriever protocol — implemented by SupabaseVectorRetriever (and any future backend)."""

from typing import Protocol, runtime_checkable


@runtime_checkable
class RetrieverProtocol(Protocol):
    async def retrieve(
        self,
        query: str,
        k: int = 5,
        course_id: int | None = None,
    ) -> list[dict]:
        """Return up to k semantically similar questions for query."""
        ...

    def format_context(self, results: list[dict]) -> str:
        """Convert retrieve() results to a prompt-ready context string."""
        ...
