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


settings = Settings()