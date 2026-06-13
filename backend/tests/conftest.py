"""
Shared pytest fixtures for the Soliton Timer API test suite.

================================================================================
ADJUST THESE IMPORTS TO YOUR ACTUAL PACKAGE LAYOUT.
The names below are placeholders — wire them to your real modules.
================================================================================
    app.main:app          -> your FastAPI() instance
    app.db:get_db          -> the dependency endpoints use to obtain a Session
    app.models             -> SQLAlchemy ORM models (Role, User, ...)
    app.config:settings    -> object holding JWT_SECRET / JWT_ISSUER / JWT_AUDIENCE
--------------------------------------------------------------------------------
DRIVER NOTE: testcontainers returns a postgresql+psycopg2:// URL by default.
If you use psycopg (v3), replace the dialect in db_url() accordingly, and add
the matching driver to your dev dependencies.
"""

import os
import pytest
from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import sessionmaker

from app.main import app          # noqa: E402  (adjust import)
from app.db.connection import get_db        # noqa: E402  (adjust import)

import os
from pathlib import Path
from dotenv import load_dotenv

# Load backend/.env so TEST_DATABASE_URL (and any app settings) are available.
load_dotenv(Path(__file__).resolve().parent.parent / ".env")


# ---------------------------------------------------------------------------
# 1. Database URL — real PostgreSQL, never SQLite.
#    Prefer an externally provided URL (CI service container), otherwise spin
#    up an ephemeral container so a single `pytest` run is self-contained.
# ---------------------------------------------------------------------------
@pytest.fixture(scope="session")
def db_url():
    url = os.getenv(
        "TEST_DATABASE_URL",
        "postgresql://postgres:postgres@localhost:5432/timer-app-test"
    )
    yield url


# ---------------------------------------------------------------------------
# 2. Engine 
# ---------------------------------------------------------------------------
@pytest.fixture(scope="session")
def engine(db_url):
    from app.db.connection import Base
    from app.db.seed import seed_db

    eng = create_engine(db_url, future=True)
    Base.metadata.create_all(eng)

    from sqlalchemy.orm import Session
    with Session(eng) as session:
        seed_db(session)        # idempotent; commits internally

    yield eng
    eng.dispose()

# ---------------------------------------------------------------------------
# 3. Reference-data sanity guard.
#    The four roles must exist after migration/seed (ADR-001). Fail loud and
#    early with a useful message rather than letting every RBAC test mis-fire.
# ---------------------------------------------------------------------------
@pytest.fixture(scope="session", autouse=True)
def _require_reference_data(engine):
    with engine.connect() as conn:
        names = {r[0] for r in conn.execute(text("SELECT name FROM roles"))}
    expected = {"user", "report_viewer", "manager", "administrator"}
    missing = expected - names
    assert not missing, (
        f"Reference roles missing after migration: {missing}. "
        "Seed permission_scopes -> roles -> role_permissions (ADR-003) "
        "in a migration or in the `engine` fixture."
    )


# ---------------------------------------------------------------------------
# 4. Per-test isolation via transaction rollback + SAVEPOINT restart.
#    Nothing the test (or the endpoint) writes is ever committed to disk, so
#    tests are order-independent and leak-free. The event listener restarts the
#    nested SAVEPOINT each time application code calls session.commit().
# ---------------------------------------------------------------------------
@pytest.fixture
def db_session(engine):
    connection = engine.connect()
    outer = connection.begin()
    Session = sessionmaker(bind=connection, future=True, expire_on_commit=False)
    session = Session()
    session.begin_nested()

    @event.listens_for(session, "after_transaction_end")
    def _restart_savepoint(sess, trans):
        if trans.nested and not trans._parent.nested:
            sess.begin_nested()

    try:
        yield session
    finally:
        session.close()
        outer.rollback()       # discard everything the test did
        connection.close()


# ---------------------------------------------------------------------------
# 5. Test client — endpoints share the test's session, so factory writes are
#    visible to the handler and the handler's commits hit the rolled-back
#    SAVEPOINT. TestClient is sequential, so one shared session is safe.
# ---------------------------------------------------------------------------
@pytest.fixture
def client(db_session):
    def _override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = _override_get_db
    from fastapi.testclient import TestClient
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


# ---------------------------------------------------------------------------
# 6. Role fixtures — a ready-made user per role. Compose with factories for
#    projects/assignments/managers when a test needs scoped state.
# ---------------------------------------------------------------------------
from tests.factories import make_user  # noqa: E402


@pytest.fixture
def regular_user(db_session):
    return make_user(db_session, role="user")


@pytest.fixture
def report_viewer(db_session):
    return make_user(db_session, role="report_viewer")


@pytest.fixture
def manager(db_session):
    return make_user(db_session, role="manager")


@pytest.fixture
def admin(db_session):
    return make_user(db_session, role="administrator")
