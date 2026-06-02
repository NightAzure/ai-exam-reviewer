"""AIProvider protocol — implemented by OllamaTutor and GeminiProvider."""

from collections.abc import AsyncIterator
from typing import Protocol, runtime_checkable


@runtime_checkable
class AIProvider(Protocol):
    model: str

    async def ask_question(
        self,
        query: str,
        *,
        context: str = "",
        conversation_context: str | None = None,
        course_title: str | None = None,
        trusted_personalization: bool = False,
    ) -> str: ...

    async def generate(self, prompt: str, system: str = "") -> str: ...

    async def stream_question(
        self,
        query: str,
        *,
        context: str = "",
        conversation_context: str | None = None,
        course_title: str | None = None,
        trusted_personalization: bool = False,
    ) -> AsyncIterator[str]: ...

    async def check_connection(self) -> bool: ...

    def get_stats(self) -> dict: ...

    def get_last_metadata(self) -> dict: ...
