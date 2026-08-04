import re
from typing import List
# pyrefly: ignore [missing-import]
from pydantic import Field, field_validator, model_validator
# pyrefly: ignore [missing-import]
from pydantic_settings import BaseSettings, SettingsConfigDict

_PLACEHOLDER_RE = re.compile(r"^TODO_", re.IGNORECASE)
_LOCAL_HOSTNAMES = {"localhost", "127.0.0.1", "0.0.0.0", "::1"}


def _is_local_url(url: str) -> bool:
    """Return True if *url* points to a local/loopback host."""
    try:
        from urllib.parse import urlparse
        host = urlparse(url).hostname or ""
        return host in _LOCAL_HOSTNAMES
    except Exception:
        return False


def _reject_blank_or_placeholder(name: str, value: str) -> str:
    """Raise ValueError when *value* is blank or starts with TODO_."""
    if not value or not value.strip():
        raise ValueError(f"{name} must not be blank")
    if _PLACEHOLDER_RE.match(value.strip()):
        raise ValueError(
            f"{name} contains a TODO_ placeholder — set a real value before starting the server"
        )
    return value


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env.local",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    APP_ENV: str = "local"
    LOG_LEVEL: str = "info"
    CORS_ORIGINS: str = "http://localhost:5173"

    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    # ── Supabase / Postgres ────────────────────────────────────────────────
    SUPABASE_URL: str
    SUPABASE_ANON_KEY: str
    SUPABASE_SERVICE_ROLE_KEY: str
    DATABASE_URL: str
    # No default — must be explicitly configured; avoids silently using a
    # shared bucket that could be misconfigured in a new environment.
    SUPABASE_STORAGE_BUCKET: str

    @field_validator("SUPABASE_URL", "SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY",
                     "DATABASE_URL", "SUPABASE_STORAGE_BUCKET", mode="before")
    @classmethod
    def reject_blank_or_placeholder(cls, v: str, info) -> str:
        val = _reject_blank_or_placeholder(info.field_name, v)
        if info.field_name == "SUPABASE_URL":
            if not _is_local_url(val) and not val.startswith("https://"):
                raise ValueError(
                    f"{info.field_name} must use https:// for non-local hosts. "
                    "HTTP is only permitted for localhost/127.0.0.1 during local development."
                )
        return val

    # ── Qdrant ────────────────────────────────────────────────────────────
    QDRANT_URL: str
    QDRANT_API_KEY: str
    QDRANT_COLLECTION: str = "exam_materials"
    # ge=1: zero or negative timeouts are never valid.
    QDRANT_TIMEOUT_SECONDS: int = Field(default=60, ge=1)

    @field_validator("QDRANT_URL", mode="before")
    @classmethod
    def require_https_for_remote_qdrant(cls, v: str) -> str:
        """Reject non-HTTPS Qdrant URLs when the host is not local/loopback."""
        if not v or not v.strip():
            raise ValueError("QDRANT_URL must not be blank")
        if not _is_local_url(v) and not v.startswith("https://"):
            raise ValueError(
                "QDRANT_URL must use https:// for non-local hosts. "
                "HTTP is only permitted for localhost/127.0.0.1 during local development."
            )
        return v

    # ── Embeddings / RAG ──────────────────────────────────────────────────
    EMBEDDING_MODEL: str = "all-MiniLM-L6-v2"
    # ge=1: at least one result; le=20: avoid runaway context windows.
    RAG_TOP_K: int = Field(default=5, ge=1, le=20)

    # ── Gemini ────────────────────────────────────────────────────────────
    GEMINI_API_KEY: str
    GEMINI_MODEL: str = "gemini-2.5-flash"

    @model_validator(mode="after")
    def validate_production_settings(self) -> "Settings":
        """Extra checks that apply only in production."""
        if self.APP_ENV == "production":
            # Reject TODO_ placeholders in Gemini model name.
            if _PLACEHOLDER_RE.match(self.GEMINI_MODEL.strip()):
                raise ValueError(
                    "GEMINI_MODEL contains a TODO_ placeholder — "
                    "set a verified model name before deploying to production."
                )
            # Warn loudly if the model looks like a dev default that hasn't
            # been confirmed against the models endpoint.
            # (Full live-verification requires a Gemini client round-trip;
            #  do that in an explicit startup check, not here.)
        return self


settings = Settings()
