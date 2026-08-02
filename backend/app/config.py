from typing import List
# pyrefly: ignore [missing-import]
from pydantic import Field
# pyrefly: ignore [missing-import]
from pydantic_settings import BaseSettings, SettingsConfigDict


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


    SUPABASE_URL: str
    SUPABASE_ANON_KEY: str
    SUPABASE_SERVICE_ROLE_KEY: str
    DATABASE_URL: str
    SUPABASE_STORAGE_BUCKET: str = "exam-material"

    QDRANT_URL: str
    QDRANT_API_KEY: str
    QDRANT_COLLECTION: str = "exam_materials"
    QDRANT_TIMEOUT_SECONDS: int = 60

    EMBEDDING_MODEL: str = "all-MiniLM-L6-v2"
    RAG_TOP_K: int = 5

    GEMINI_API_KEY: str
    GEMINI_MODEL: str = "gemini-2.5-flash"


settings = Settings()
