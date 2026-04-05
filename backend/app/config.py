import os
from functools import lru_cache
from pathlib import Path

from dotenv import load_dotenv
from pydantic_settings import BaseSettings


BACKEND_ROOT = Path(__file__).resolve().parents[1]
load_dotenv(BACKEND_ROOT / ".env")


def _get_bool_env(key: str, default: bool) -> bool:
    raw = os.getenv(key)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


def _get_int_env(key: str, default: int) -> int:
    raw = os.getenv(key)
    if raw is None:
        return default
    try:
        return int(raw)
    except ValueError:
        return default


def _get_list_env(key: str, default: list[str]) -> list[str]:
    raw = os.getenv(key)
    if not raw:
        return default
    return [item.strip() for item in raw.split(",") if item.strip()]


class Settings(BaseSettings):
    # App
    APP_NAME: str = os.getenv("APP_NAME", "ResumeAse ATS API")
    APP_VERSION: str = os.getenv("APP_VERSION", "1.0.0")
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    DEBUG: bool = _get_bool_env("DEBUG", True)

    # Providers
    AUTH_PROVIDER: str = os.getenv("AUTH_PROVIDER", "supabase")  # supabase
    DATABASE_PROVIDER: str = os.getenv("DATABASE_PROVIDER", "supabase")  # supabase

    # JWT
    JWT_SECRET: str = os.getenv("JWT_SECRET", "changeme-super-secret-key")
    JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
    JWT_EXPIRE_HOURS: int = _get_int_env("JWT_EXPIRE_HOURS", 24)

    # Google OAuth
    GOOGLE_CLIENT_ID: str = os.getenv("GOOGLE_CLIENT_ID", "")

    # Supabase
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_ANON_KEY: str = os.getenv("SUPABASE_ANON_KEY", "")
    SUPABASE_SERVICE_ROLE_KEY: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

    # GitHub
    GITHUB_TOKEN: str = os.getenv("GITHUB_TOKEN", "")

    # Cerebras LLM
    CEREBRAS_API_KEY: str = os.getenv("CEREBRAS_API_KEY", "")
    CEREBRAS_MODEL: str = os.getenv("CEREBRAS_MODEL", "")

    # CORS
    CORS_ORIGINS: list[str] = _get_list_env(
        "CORS_ORIGINS",
        [
            "http://localhost:3000",
            "http://localhost:3001",
        ],
    )

    class Config:
        env_file = str(BACKEND_ROOT / ".env")
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
