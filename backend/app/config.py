from pydantic_settings import BaseSettings
from functools import lru_cache
from pathlib import Path
import logging

logger = logging.getLogger(__name__)

BACKEND_ROOT = Path(__file__).resolve().parents[1]


class Settings(BaseSettings):
    # App
    APP_NAME: str = "ResumeAse ATS API"
    APP_VERSION: str = "1.0.0"
    # Safer default: assume production unless explicitly set to development
    ENVIRONMENT: str = "production"
    # Default to False — tracebacks must never appear in production responses
    DEBUG: bool = False

    # Providers
    AUTH_PROVIDER: str = "supabase"
    DATABASE_PROVIDER: str = "supabase"

    # Google OAuth
    GOOGLE_CLIENT_ID: str = ""

    # Supabase
    SUPABASE_URL: str = ""
    SUPABASE_ANON_KEY: str = ""
    SUPABASE_SERVICE_ROLE_KEY: str = ""

    # GitHub
    GITHUB_TOKEN: str = ""

    # Cerebras LLM
    CEREBRAS_API_KEY: str = ""
    CEREBRAS_MODEL: str = "llama-3.3-70b"

    # CORS — only allow known frontend origins
    CORS_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://localhost:3001",
    ]

    class Config:
        env_file = str(BACKEND_ROOT / ".env")
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    s = Settings()
    _validate_settings(s)
    return s


def _validate_settings(s: Settings) -> None:
    """Warn about unsafe runtime configuration."""
    if s.ENVIRONMENT != "development" and s.DEBUG:
        logger.warning(
            "DEBUG=True in a non-development environment. "
            "Set DEBUG=False in production to avoid leaking stack traces."
        )


settings = get_settings()
