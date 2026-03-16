from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # App
    APP_NAME: str = "ResumeAse ATS API"
    APP_VERSION: str = "1.0.0"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True

    # Providers
    AUTH_PROVIDER: str = "supabase"  # supabase
    DATABASE_PROVIDER: str = "supabase"  # supabase

    # JWT
    JWT_SECRET: str = "changeme-super-secret-key"
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

    # CORS
    CORS_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://localhost:3001",
    ]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
