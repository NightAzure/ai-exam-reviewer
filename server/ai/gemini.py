"""
Gemini provider — fallback when Ollama is unavailable or DISABLE_OLLAMA=true.

Implements AIProvider so it is a drop-in replacement for OllamaTutor.
"""

from typing import Any
import time

import google.generativeai as genai

from config import get_settings


class GeminiProvider:
    def __init__(
        self,
        model_name: str | None = None,
        api_key: str | None = None,
    ) -> None:
        cfg = get_settings()
        self.model: str = model_name or cfg.gemini_model
        _key = api_key or cfg.google_generative_ai_api_key
        if not _key:
            raise RuntimeError("GOOGLE_GENERATIVE_AI_API_KEY is not set")
        genai.configure(api_key=_key)
        self._client = genai.GenerativeModel(self.model)
        self._last_metadata: dict[str, Any] = {}

    async def check_connection(self) -> bool:
        return self._client is not None

    async def ask_question(
        self,
        query: str,
        *,
        context: str = "",
        conversation_context: str | None = None,
        course_title: str | None = None,
        trusted_personalization: bool = False,
    ) -> str:
        parts: list[str] = []
        if conversation_context and conversation_context.strip():
            parts.append(f"Recent conversation:\n{conversation_context.strip()}")
        if context:
            parts.append(context)
        parts.append(f"Student question: {query}")
        prompt = "\n\n---\n\n".join(parts)

        system = (
            "You are an expert board exam tutor specialising in GEAS and engineering topics. "
            "Answer clearly, step by step, with LaTeX for maths (\\( ... \\) inline, "
            "\\[ ... \\] display). Box final answers with \\boxed{}."
        )
        if course_title:
            system += f" The student is studying: {course_title}."

        return await self.generate(prompt, system=system)

    async def generate(self, prompt: str, system: str = "") -> str:
        start = time.time()
        full_prompt = f"{system}\n\n{prompt}".strip() if system else prompt
        response = self._client.generate_content(full_prompt)
        usage = getattr(response, "usage_metadata", None)
        prompt_tokens = getattr(usage, "prompt_token_count", None) if usage else None
        completion_tokens = getattr(usage, "candidates_token_count", None) if usage else None
        total_tokens = getattr(usage, "total_token_count", None) if usage else None
        self._last_metadata = {
            "provider": "gemini",
            "model": self.model,
            "prompt_tokens": prompt_tokens,
            "completion_tokens": completion_tokens,
            "total_tokens": total_tokens,
            "response_time": round(time.time() - start, 3),
        }
        return response.text

    def get_stats(self) -> dict:
        return {"model": self.model, "provider": "gemini"}

    def get_last_metadata(self) -> dict:
        return dict(self._last_metadata)
