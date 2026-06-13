import os
from dotenv import load_dotenv
load_dotenv()


class Settings:
    # ── Security ──────────────────────────────────────────────────────────────
    SECRET_KEY: str = os.getenv("SECRET_KEY", "change-me-in-production")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "480"))
    MICROSOFT_TENANT_ID: str = os.getenv("MICROSOFT_TENANT_ID", "default")
    MICROSOFT_CLIENT_ID: str = os.getenv("MICROSOFT_CLIENT_ID", "default")

    # ── Database ──────────────────────────────────────────────────────────────
    DATABASE_PATH: str = os.getenv("DATABASE_URL", "./timer.db")

    # ── Server ────────────────────────────────────────────────────────────────
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8000"))

    # ── BFF / OAuth ─────────────────────────────────────────────────────────────
    MICROSOFT_CLIENT_SECRET: str = os.getenv("MICROSOFT_CLIENT_SECRET", "")
    OAUTH_REDIRECT_URI: str = os.getenv("OAUTH_REDIRECT_URI", "http://localhost:5173/api/auth/callback")
    POST_LOGIN_PATH: str = os.getenv("POST_LOGIN_PATH", "/dashboard")

    # ── Sessions (Redis) ──────────────────────────────────────────────────────
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    SESSION_TTL_SECONDS: int = int(os.getenv("SESSION_TTL_SECONDS", "1800"))
    SESSION_COOKIE_NAME: str = os.getenv("SESSION_COOKIE_NAME", "session")

    # ── CSRF ──────────────────────────────────────────────────────────────────
    CSRF_COOKIE_NAME: str = os.getenv("CSRF_COOKIE_NAME", "csrf_token")
    CSRF_HEADER_NAME: str = os.getenv("CSRF_HEADER_NAME", "X-CSRF-Token")

    # ── Cookies ───────────────────────────────────────────────────────────────
    COOKIE_SECURE: bool = os.getenv("COOKIE_SECURE", "false").strip().lower() in {"1", "true", "yes", "on"}


settings = Settings()