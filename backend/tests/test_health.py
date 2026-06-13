"""
System Health Endpoints — TC 150-151.
GET /health   (public; must not leak internal detail)
"""

from tests.helpers import as_items  # noqa: F401  (kept for symmetry; not required)

# Keys that would indicate the health endpoint is leaking internals (TC-151).
FORBIDDEN_KEYS = {"database", "db", "db_url", "version", "build", "env",
                  "environment", "config", "stack_trace", "path", "secret"}


# --- TC-150 GET /health — public access returns 200 -----------------------
def test_health_public(client):
    r = client.get("/health")          # no auth header
    assert r.status_code == 200


# --- TC-151 GET /health — must not expose internal details ----------------
def test_health_no_internal_details(client):
    r = client.get("/health")
    assert r.status_code == 200
    body = r.json()
    leaked = FORBIDDEN_KEYS & set(_flatten_keys(body))
    assert not leaked, f"Health endpoint leaked internal keys: {leaked}"


def _flatten_keys(node):
    keys = set()
    if isinstance(node, dict):
        for k, v in node.items():
            keys.add(k.lower())
            keys |= _flatten_keys(v)
    elif isinstance(node, list):
        for v in node:
            keys |= _flatten_keys(v)
    return keys
