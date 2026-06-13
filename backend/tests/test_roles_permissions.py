"""
Role & Permission Administration Endpoints — TC 144-149.
GET /roles | GET /permission-scopes | GET /role-permissions

All three are administrator-only and read-only (no mutation endpoints exist).
"""

import pytest

from tests.factories import make_user
from tests.helpers import auth_headers, as_items


# --- TC-144 GET /roles — administrator gets all roles ---------------------
def test_roles_admin(client, admin):
    r = client.get("/roles", headers=auth_headers(admin))
    assert r.status_code == 200
    names = {role["name"] for role in as_items(r.json())}
    assert {"user", "report_viewer", "manager", "administrator"} <= names


# --- TC-145 GET /roles — non-administrator gets 403 -----------------------
@pytest.mark.parametrize("role", ["user", "report_viewer", "manager"])
def test_roles_non_admin_forbidden(client, db_session, role):
    actor = make_user(db_session, role=role)
    assert client.get("/roles", headers=auth_headers(actor)).status_code == 403


# --- TC-146 GET /permission-scopes — administrator gets all scopes --------
def test_permission_scopes_admin(client, admin):
    r = client.get("/permission-scopes", headers=auth_headers(admin))
    assert r.status_code == 200
    assert len(as_items(r.json())) > 0


# --- TC-147 GET /permission-scopes — non-administrator gets 403 -----------
@pytest.mark.parametrize("role", ["user", "report_viewer", "manager"])
def test_permission_scopes_non_admin_forbidden(client, db_session, role):
    actor = make_user(db_session, role=role)
    assert client.get("/permission-scopes", headers=auth_headers(actor)).status_code == 403


# --- TC-148 GET /role-permissions — administrator gets mappings -----------
def test_role_permissions_admin(client, admin):
    r = client.get("/role-permissions", headers=auth_headers(admin))
    assert r.status_code == 200
    assert len(as_items(r.json())) > 0          # mappings present; read-only endpoint


# --- TC-149 GET /role-permissions — non-administrator gets 403 ------------
@pytest.mark.parametrize("role", ["user", "report_viewer", "manager"])
def test_role_permissions_non_admin_forbidden(client, db_session, role):
    actor = make_user(db_session, role=role)
    assert client.get("/role-permissions", headers=auth_headers(actor)).status_code == 403
