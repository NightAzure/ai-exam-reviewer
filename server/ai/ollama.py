#!/usr/bin/env python3
"""
Ollama provider — primary AI backend (LLM inference only).

RAG retrieval is handled upstream by SupabaseVectorRetriever and injected
as a pre-formatted context string. This class has no local file dependencies.
"""

import re
import time
from typing import Any

import ollama
import torch

from config import get_settings


# ── Module-level GPU info (cosmetic, logged at startup) ───────────────────────

_GPU_AVAILABLE = torch.cuda.is_available()
_GPU_NAME = torch.cuda.get_device_name(0) if _GPU_AVAILABLE else "None"
_GPU_MEMORY_GB = (
    torch.cuda.get_device_properties(0).total_memory / 1024 ** 3
    if _GPU_AVAILABLE
    else 0.0
)


# ── Provider ──────────────────────────────────────────────────────────────────

class OllamaTutor:
    """
    Async Ollama inference layer.

    Constructed once in the lifespan hook and stored on app.state.
    RAG context is passed in by the endpoint — this class never touches disk.
    """

    def __init__(
        self,
        model_name: str | None = None,
        host: str | None = None,
        extra_options: dict | None = None,
    ) -> None:
        cfg = get_settings()
        self.model: str = model_name or cfg.ollama_model
        _host = (host or cfg.ollama_host).strip()
        self._client = ollama.AsyncClient(host=_host) if _host else ollama.AsyncClient()

        self.chat_options: dict[str, Any] = {
            "num_gpu": -1,
            "num_thread": 16,
            "num_ctx": 8192,
            "num_predict": 1792,
            "temperature": 0.08,
            "top_k": 32,
            "top_p": 0.82,
            "repeat_penalty": 1.15,
            "presence_penalty": 0.0,
            "frequency_penalty": 0.0,
            "seed": -1,
            "tfs_z": 1.0,
            "typical_p": 1.0,
            "repeat_last_n": 64,
            "penalize_newline": False,
            "numa": False,
            "mirostat": 0,
            "mirostat_tau": 5.0,
            "mirostat_eta": 0.1,
            "num_batch": 1024,
            "num_keep": 24,
            "stop": ["\\nHuman:", "\\nStudent:", "\\nUser:"],
            "f16_kv": True,
            "low_vram": False,
            "vocab_only": False,
            "use_mmap": True,
            "use_mlock": False,
            "rope_frequency_base": 10000.0,
            "rope_frequency_scale": 1.0,
        }
        if extra_options:
            self.chat_options.update(extra_options)

        self._stats: dict[str, Any] = {
            "questions_answered": 0,
            "total_response_time": 0.0,
            "topic_performance": {},
        }
        self._last_metadata: dict[str, Any] = {}

    # ── Connection check ──────────────────────────────────────────────────────

    async def check_connection(self) -> bool:
        try:
            models_response = await self._client.list()
            available: list[str] = []
            if hasattr(models_response, "models"):
                for m in models_response.models:
                    if hasattr(m, "model"):
                        available.append(m.model)
            elif isinstance(models_response, dict):
                for m in models_response.get("models", []):
                    name = m.get("name") or m.get("model", "")
                    if name:
                        available.append(name)
            return self.model in available
        except Exception:
            return False

    # ── Primary chat ──────────────────────────────────────────────────────────

    async def ask_question(
        self,
        query: str,
        *,
        context: str = "",
        conversation_context: str | None = None,
        course_title: str | None = None,
        trusted_personalization: bool = False,
    ) -> str:
        start = time.time()

        system_prompt = self._build_system_prompt(
            has_conversation_history=bool(conversation_context and conversation_context.strip()),
            course_title=course_title,
            trusted_session=trusted_personalization,
        )
        user_prompt = self._build_user_prompt(
            query,
            context,
            conversation_context=conversation_context,
            trusted_session=trusted_personalization,
        )
        if "qwen3" in self.model.lower() and "/no_think" not in user_prompt:
            user_prompt = f"/no_think\n{user_prompt}"

        try:
            response = await self._client.chat(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                options=self.chat_options,
                think=False,
            )
            answer = response["message"]["content"]
        except ollama.ResponseError as exc:
            raise RuntimeError(f"Ollama response error: {exc}") from exc
        except Exception as exc:
            raise RuntimeError(f"Ollama request failed: {exc}") from exc

        final = self._post_process(answer)
        if not final:
            raw_len = len(answer or "")
            raise RuntimeError(
                f"Ollama returned an empty chat response; model={self.model}; raw_len={raw_len}"
            )
        elapsed = time.time() - start
        self._record(query, elapsed)
        prompt_tokens = response.get("prompt_eval_count") if hasattr(response, "get") else getattr(response, "prompt_eval_count", None)
        completion_tokens = response.get("eval_count") if hasattr(response, "get") else getattr(response, "eval_count", None)
        total_tokens = (
            prompt_tokens + completion_tokens
            if isinstance(prompt_tokens, int) and isinstance(completion_tokens, int)
            else None
        )
        self._last_metadata = {
            "provider": "ollama",
            "model": self.model,
            "prompt_tokens": prompt_tokens,
            "completion_tokens": completion_tokens,
            "total_tokens": total_tokens,
            "response_time": round(elapsed, 3),
        }
        print(f"[TIME] {elapsed:.2f}s")
        return final

    # ── One-shot generation (hints, review, notes, etc.) ─────────────────────

    async def generate(self, prompt: str, system: str = "") -> str:
        start = time.time()
        messages = []
        if system:
            messages.append({"role": "system", "content": system})
        one_shot_prompt = prompt
        if "qwen3" in self.model.lower() and "/no_think" not in one_shot_prompt:
            one_shot_prompt = f"/no_think\n{one_shot_prompt}"
        messages.append({"role": "user", "content": one_shot_prompt})

        response = await self._client.chat(
            model=self.model,
            messages=messages,
            options={"temperature": 0.2, "num_predict": 4096},
            think=False,
        )
        prompt_tokens = response.get("prompt_eval_count") if hasattr(response, "get") else getattr(response, "prompt_eval_count", None)
        completion_tokens = response.get("eval_count") if hasattr(response, "get") else getattr(response, "eval_count", None)
        total_tokens = (
            prompt_tokens + completion_tokens
            if isinstance(prompt_tokens, int) and isinstance(completion_tokens, int)
            else None
        )
        self._last_metadata = {
            "provider": "ollama",
            "model": self.model,
            "prompt_tokens": prompt_tokens,
            "completion_tokens": completion_tokens,
            "total_tokens": total_tokens,
            "response_time": round(time.time() - start, 3),
        }
        return response["message"]["content"]

    # ── Stats ─────────────────────────────────────────────────────────────────

    def get_stats(self) -> dict:
        total = sum(
            t["questions_asked"]
            for t in self._stats["topic_performance"].values()
        )
        avg = self._stats["total_response_time"] / max(1, total)
        return {
            "model": self.model,
            "gpu_available": _GPU_AVAILABLE,
            "gpu_name": _GPU_NAME,
            "questions_answered": total,
            "avg_response_time": f"{avg:.2f}s",
            "topics_covered": list(self._stats["topic_performance"].keys()),
        }

    def get_last_metadata(self) -> dict:
        return dict(self._last_metadata)

    # ── Internal helpers ──────────────────────────────────────────────────────

    def _record(self, query: str, elapsed: float) -> None:
        topic = self._topic_of(query)
        perf = self._stats["topic_performance"]
        if topic not in perf:
            perf[topic] = {"questions_asked": 0}
        perf[topic]["questions_asked"] += 1
        self._stats["total_response_time"] += elapsed

    def _topic_of(self, query: str) -> str:
        keywords = {
            "algebra": ["equation", "solve", "polynomial", "permutation", "combination"],
            "calculus": ["derivative", "integral", "limit"],
            "geometry": ["triangle", "circle", "area"],
            "physics": ["force", "energy", "power"],
            "probability": ["probability", "random"],
        }
        q = query.lower()
        for topic, kws in keywords.items():
            if any(k in q for k in kws):
                return topic
        return "general"

    def _build_system_prompt(
        self,
        *,
        has_conversation_history: bool = False,
        course_title: str | None = None,
        trusted_session: bool = False,
    ) -> str:
        course_line = ""
        if course_title and str(course_title).strip():
            course_line = (
                f"Course context: the learner is working in \"{str(course_title).strip()}\". "
                "Align examples, vocabulary, and standards references with that track when it helps.\n\n"
            )

        continuity = ""
        if has_conversation_history:
            continuity = (
                "\nSession continuity:\n"
                "- Use the transcript only to personalize for this learner in this session.\n"
                "- Resolve \"it\", \"that option\", or \"the last problem\" from the thread.\n"
            )
            if trusted_session:
                continuity += (
                    "- This history was loaded for a single authenticated learner; treat it as private.\n\n"
                )

        core = """You are an elite board-exam tutor and reviewer for architecture, GEAS, and EE-style subjects.
You combine first-principles problem solving, exam-smart reasoning, and clear teaching.
Your job is to be useful in the shape the learner actually needs.

Operating contract:
- Match the user's intent. Greetings get a brief friendly reply. Definitions get a concise explanation.
  Worked problems and MCQs get structured tutoring.
- Do not force exam scaffolding for casual chat, definitions, navigation questions, or short factual questions.
- If the stem is ambiguous, restate your interpretation in one line before solving.
- Use short paragraphs and headings only when they add clarity.
- **RAG hygiene:** Similar bank excerpts are study aids—they can be wrong or a different problem. Never let a
  retrieved letter override the actual stem.

Domain coverage:
- GEAS / Electrical Engineering: quantitative rigor, units, signs, diagrams-in-words, calculator-ready steps.
- Architecture / professional practice: design intent, life safety, codes (no fabricated section numbers).

Exam and accuracy:
1. For MCQs and worked problems, re-read for NOT / EXCEPT / best / least / units.
2. Use a Verify step before the final answer only for actual solved problems.
3. Use \\boxed{} only for final numeric or symbolic answers in solved problems.
4. Use only transcript, bank excerpts, course documents, and standard domain knowledge.

CRITICAL - LaTeX Formatting Rules:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. INLINE MATH: Use \\( ... \\) for inline formulas
2. DISPLAY MATH: Use \\[ ... \\] for centered equations
3. FINAL ANSWERS: Use \\boxed{} only for final numeric or symbolic answers in solved problems
4. DO NOT USE dollar signs: $formula$ or $$formula$$
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"""
        return course_line + continuity + core

    def _build_user_prompt(
        self,
        query: str,
        context: str,
        *,
        conversation_context: str | None = None,
        max_history_chars: int = 4500,
        trusted_session: bool = False,
    ) -> str:
        parts: list[str] = []

        if conversation_context and conversation_context.strip():
            hist = conversation_context.strip()
            if len(hist) > max_history_chars:
                hist = "...(truncated)\n" + hist[-max_history_chars:]
            header = (
                "Authorized session transcript for this learner only:\n"
                if trusted_session
                else "Recent conversation with this student:\n"
            )
            parts.append(header + hist)

        if context:
            parts.append(context)

        prompt = ("\n\n---\n\n".join(parts) + "\n\n---\n\n") if parts else ""
        prompt += f"Current student message:\n\n{query}\n\n"
        prompt += self._response_style_instruction(query)
        return prompt

    def _response_style_instruction(self, query: str) -> str:
        q = " ".join(query.lower().strip().split())
        greetings = {
            "hi", "hello", "hey", "yo", "good morning", "good afternoon",
            "good evening", "sup", "hi there", "hello there",
        }
        if q in greetings:
            return (
                "Response style: reply naturally in 1-2 short sentences. "
                "Do not use Plan/Work/Distractors/Verify/Answer/Takeaway. "
                "Do not use \\boxed{}."
            )

        q_no_mark = q[:-1].strip() if q.endswith("?") else q
        definition_starters = (
            "what is ", "what are ", "who is ", "who are ", "define ",
            "meaning of ", "explain what ", "tell me what ",
        )
        if q_no_mark.startswith(definition_starters) and len(q_no_mark.split()) <= 12:
            return (
                "Response style: give a concise definition first, then 1-3 clarifying bullets only if helpful. "
                "If the term is course-specific or not in the provided context, say so instead of inventing details. "
                "Do not use Plan/Work/Distractors/Verify/Answer/Takeaway. Do not use \\boxed{}."
            )

        problem_signals = (
            "solve", "compute", "calculate", "find", "derive", "prove",
            "which of the following", "answer choices",
        )
        has_mcq_letters = all(token in q for token in ("a.", "b.", "c.", "d."))
        if has_mcq_letters or any(signal in q for signal in problem_signals):
            return (
                "Response style for this problem: use **Plan**, **Work**, **Verify**, and **Answer**. "
                "Use **Distractors** only if the user provided answer choices or asks about MCQ options. "
                "Use \\boxed{} only for the final numeric or symbolic answer."
            )

        return (
            "Response style: answer directly and conversationally. Use short headings only when they add clarity. "
            "Do not use Plan/Work/Distractors/Verify/Answer/Takeaway unless solving a concrete problem."
        )

    def _post_process(self, answer: str) -> str:
        answer = answer.strip()
        lines = answer.split("\n")
        fixed: list[str] = []

        for line in lines:
            if "\\[" in line or "\\(" in line:
                fixed.append(line)
                continue
            has_latex = any(
                cmd in line
                for cmd in [
                    "\\text{", "\\frac", "\\sqrt", "\\circ", "\\begin{",
                    "\\Omega", "\\theta", "\\phi", "\\alpha", "\\beta",
                ]
            )
            if has_latex and line.count("\\") >= 2:
                stripped = line.strip()
                if ":" in stripped and not stripped.startswith("["):
                    p = stripped.split(":", 1)
                    fixed.append(f"{p[0]}:")
                    fixed.append(f"\\[ {p[1].strip()} \\]")
                    continue
                elif not stripped.startswith("["):
                    fixed.append(f"\\[ {stripped} \\]")
                    continue
            fixed.append(line)

        answer = "\n".join(fixed)

        try:
            answer = re.sub(r"\[\s+(.+?)\s+\]", r"\\[ \1 \\]", answer)
        except Exception:
            pass
        try:
            answer = re.sub(r"\$\$(.+?)\$\$", r"\\[ \1 \\]", answer, flags=re.DOTALL)
        except Exception:
            pass
        try:
            parts = answer.split("$")
            if len(parts) > 2:
                result = [parts[0]]
                for i in range(1, len(parts), 2):
                    if i < len(parts) - 1:
                        result.append(f"\\( {parts[i]} \\)")
                        if i + 1 < len(parts):
                            result.append(parts[i + 1])
                answer = "".join(result)
        except Exception:
            pass

        answer = answer.replace("\\\\[", "\\[").replace("\\\\]", "\\]")
        answer = answer.replace("\\\\(", "\\(").replace("\\\\)", "\\)")
        while "\n\n\n" in answer:
            answer = answer.replace("\n\n\n", "\n\n")
        while "  " in answer:
            answer = answer.replace("  ", " ")

        return answer.strip()


# ── Backward-compat module-level check (used by old providers.py) ─────────────

def check_ollama_connection(model_name: str | None = None) -> bool:
    """Synchronous connectivity check. Use OllamaTutor.check_connection() in async contexts."""
    import asyncio
    cfg = get_settings()
    host = cfg.ollama_host.strip()
    client = ollama.Client(host=host) if host else ollama.Client()
    target = model_name or cfg.ollama_model
    try:
        models_response = client.list()
        available: list[str] = []
        if hasattr(models_response, "models"):
            for m in models_response.models:
                if hasattr(m, "model"):
                    available.append(m.model)
        elif isinstance(models_response, dict):
            for m in models_response.get("models", []):
                name = m.get("name") or m.get("model", "")
                if name:
                    available.append(name)
        return target in available
    except Exception:
        return False
