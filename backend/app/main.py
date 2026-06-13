"""
Application entry point.
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.middleware.csrf import CSRFMiddleware
from app.middleware.security_headers import SecurityHeadersMiddleware
   
from app.api import router as api_router
from app.db.init_db import init_db


# Logging Configuration
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s - %(message)s",
)

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application startup and shutdown lifecycle.
    """

    logger.info("Initialising PostgreSQL database...")

    # Create SQLAlchemy tables
    init_db()

    logger.info("Database ready.")

    yield

    logger.info("Application shutdown complete.")


# FastAPI App
app = FastAPI(
    title="Timer App API",
    description=(
        "Backend for the Timer App. "
        "Provides authentication, task management, "
        "timer control, and dashboard analytics."
    ),
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)


# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "*"
        # Example production origins:
        # "http://localhost:3000",
        # "http://localhost:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Global Exception Handler
@app.exception_handler(Exception)
async def unhandled_exception_handler(
    request: Request,
    exc: Exception,
):
    """
    Catch unexpected server errors.
    """

    logger.exception(
        "Unhandled error on %s %s",
        request.method,
        request.url,
    )

    return JSONResponse(
        status_code=500,
        content={
            "detail": (
                "An unexpected error occurred. "
                "Please try again later."
            )
        },
    )


# API Routes
app.include_router(api_router, prefix="/api")
app.add_middleware(CSRFMiddleware)
app.add_middleware(SecurityHeadersMiddleware)

# Health Check
@app.get(
    "/health",
    tags=["Health"],
    include_in_schema=False,
)
def health():
    """
    Lightweight health endpoint.
    """

    return {
        "status": "ok",
    }