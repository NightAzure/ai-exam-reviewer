"""
Centralised settings for the FastAPI server.

Reads env vars and .env files via Pydantic BaseSettings.
Import get_settings() anywhere — results are cached after the first call.
"""

from functools import lru_cache
from pathlib import Path
from typing import Annotated

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

_SERVER_DIR = Path(__file__).resolve().parent
_REPO_ROOT = _SERVER_DIR.parent


class Settings(BaseSettings):
    # ── Supabase ──────────────────────────────────────────────────────────────
    # Accepts both the unprefixed server name and the NEXT_PUBLIC_ frontend name.
    next_public_supabase_url: str = ""
    supabase_url: str = ""
    supabase_service_role_key: str = ""
    next_public_supabase_publishable_key: str = ""
    next_public_supabase_anon_key: str = ""
    supabase_anon_key: str = ""

    # ── Ollama ────────────────────────────────────────────────────────────────
    ai_provider: str = "auto"
    ollama_model: str = "qwen2.5:14b-instruct"
    ollama_host: str = ""
    disable_ollama: bool = False

    # ── Gemini ────────────────────────────────────────────────────────────────
    google_generative_ai_api_key: str = ""
    gemini_model: str = "gemini-1.5-flash"

    aws_region: str = ""
    aws_default_region: str = ""
    aws_profile: str = ""
    bedrock_model_id: str = "anthropic.claude-3-5-sonnet-20240620-v1:0"
    bedrock_max_tokens: int = 2048
    bedrock_temperature: float = 0.1
    bedrock_top_p: float = 0.9
    bedrock_connect_timeout_seconds: float = 5.0
    bedrock_read_timeout_seconds: float = 90.0
    generation_worker_id: str = "fastapi-worker"
    generation_job_lease_seconds: int = 300

    # ── Security ──────────────────────────────────────────────────────────────
    tutor_api_key: str = ""
    allowed_origins: str = "http://localhost:3000"

    # ── RAG / Embedding ───────────────────────────────────────────────────────
    embedding_model: str = "all-MiniLM-L6-v2"

    model_config = SettingsConfigDict(
        # Later files win; server/.env.local has highest priority among env files.
        env_file=(
            str(_REPO_ROOT / ".env"),
            str(_REPO_ROOT / ".env.local"),
            str(_SERVER_DIR / ".env"),
            str(_SERVER_DIR / ".env.local"),
        ),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
        populate_by_name=True,
    )

    # ── Derived properties ────────────────────────────────────────────────────

    @property
    def supabase_url_effective(self) -> str:
        return (self.supabase_url or self.next_public_supabase_url).strip()

    @property
    def supabase_auth_key(self) -> str:
        """Anon/publishable key used for token validation against Supabase Auth."""
        return (
            self.supabase_anon_key
            or self.next_public_supabase_anon_key
            or self.next_public_supabase_publishable_key
            or self.supabase_service_role_key
        ).strip()

    @property
    def allowed_origins_list(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins.split(",") if o.strip()]

    @property
    def ai_provider_normalized(self) -> str:
        provider = (self.ai_provider or "auto").strip().lower()
        return provider if provider in {"auto", "ollama", "gemini", "bedrock"} else "auto"

    @property
    def bedrock_region_effective(self) -> str:
        return (self.aws_region or self.aws_default_region).strip()

    @property
    def supabase_configured(self) -> bool:
        return bool(self.supabase_url_effective and self.supabase_service_role_key)

    @property
    def supabase_auth_configured(self) -> bool:
        return bool(self.supabase_url_effective and self.supabase_auth_key)


@lru_cache
def get_settings() -> Settings:
    return Settings()
