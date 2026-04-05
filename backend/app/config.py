from pydantic_settings import BaseSettings
from functools import lru_cache
from pathlib import Path
import logging

logger = logging.getLogger(__name__)

BACKEND_ROOT = Path(__file__).resolve().parents[1]

# Placeholder values that must never reach production
_INSECURE_JWT_DEFAULTS = {
    "",
    "changeme-super-secret-key",
    "change-me-to-something-secure-in-production",
}


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

    # JWT — MUST be overridden via .env in every environment
    JWT_SECRET: str = ""
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_HOURS: int = 24

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
    """Crash fast if critical secrets are missing or insecure defaults are used."""
    if s.JWT_SECRET in _INSECURE_JWT_DEFAULTS:
        raise ValueError(
            "JWT_SECRET is not configured. "
            "Set a cryptographically random 256-bit secret in your .env file. "
            "Generate one with: python -c \"import secrets; print(secrets.token_hex(32))\""
        )
    if len(s.JWT_SECRET) < 32:
        raise ValueError(
            f"JWT_SECRET is too short ({len(s.JWT_SECRET)} chars). "
            "Use at least 32 characters (256 bits)."
        )
    if s.ENVIRONMENT != "development" and s.DEBUG:
        logger.warning(
            "DEBUG=True in a non-development environment. "
            "Set DEBUG=False in production to avoid leaking stack traces."
        )


settings = get_settings()
