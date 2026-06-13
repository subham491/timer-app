from collections.abc import Generator
from typing import Annotated

from fastapi import Depends
from sqlalchemy import create_engine
from sqlalchemy.pool import NullPool
from sqlalchemy.orm import Session, sessionmaker, DeclarativeBase
from sqlalchemy_utils import database_exists, create_database

from app.config import settings


DATABASE_URL= settings.DATABASE_PATH


# SQLAlchemy Base
class Base(DeclarativeBase):
    pass


# Create PostgreSQL Engine
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    echo=False,
    poolclass=NullPool,
)

# Create database automatically
if not database_exists(engine.url):
    create_database(engine.url)


# Session Factory
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)


def get_db() -> Generator[Session, None, None]:
    """
    FastAPI dependency that provides a SQLAlchemy session.

    • On clean exit  → commit (the route handler succeeded).
    • On any error   → rollback so partial writes are never persisted,
                       then re-raise so FastAPI can return the correct
                       HTTP error to the client.
    • Always         → close the session so the connection is returned to
                       the pool immediately, preventing connection exhaustion.
    """
    db = SessionLocal()

    try:
        yield db
        db.commit()

    except Exception:
        db.rollback()
        raise

    finally:
        db.close()


# Dependency Alias
DBSession = Annotated[Session, Depends(get_db)]