"""HTTP-level tests for the MCP Hub CRUD endpoints (issue #15 — MCP-1a).

Tests exercise the public `/api/mcps` interface via TestClient. Auth is mocked
by overriding `get_current_user`, so the real role-checking closures
(`require_admin` / `require_any_role`) run against our synthesized UserInfo.
Blob storage is replaced via `get_mcp_service` override, which lets tests
inject an `McpService` backed by an in-memory dict.
"""

import pytest

from app.core.auth.dependencies import UserInfo, get_current_user
from app.core.main import app


class _InMemoryStore:
    """Dict-backed substitute for the blob store used by McpService in tests."""

    def __init__(self):
        self._data: dict[str, dict] = {}

    def write_json(self, path: str, data: dict) -> None:
        self._data[path] = data

    def read_json(self, path: str) -> dict | None:
        return self._data.get(path)

    def list_names(self, prefix: str) -> list[str]:
        return [p for p in self._data if p.startswith(prefix)]

    def exists(self, path: str) -> bool:
        return path in self._data


def _admin(tenant_id: str = "tenant-a") -> UserInfo:
    return UserInfo(
        oid="admin-oid",
        tenant_id=tenant_id,
        name="Admin",
        email="admin@x.com",
        roles=["SkillAdmin"],
    )


def _read_only(tenant_id: str = "tenant-a") -> UserInfo:
    return UserInfo(
        oid="user-oid",
        tenant_id=tenant_id,
        name="User",
        email="user@x.com",
        roles=["SkillUser"],
    )


@pytest.fixture
def as_admin():
    """Override auth + MCP service for a SkillAdmin in tenant-a with an empty store."""
    from app.mcps.router import get_mcp_service
    from app.mcps.service import McpService

    store = _InMemoryStore()
    svc = McpService(store=store)
    app.dependency_overrides[get_current_user] = lambda: _admin()
    app.dependency_overrides[get_mcp_service] = lambda: svc
    yield store
    app.dependency_overrides.clear()


AUTH = {"Authorization": "Bearer fake-token"}


def test_admin_creates_mcp_and_sees_it_in_list(client, as_admin):
    # Starts empty
    resp = client.get("/api/mcps", headers=AUTH)
    assert resp.status_code == 200
    assert resp.json() == {"mcps": []}

    # Create an MCP
    body = {
        "name": "my-mcp",
        "display_name": "My MCP",
        "description": "Test MCP registration",
        "endpoint_url": "https://example.com/mcp",
        "transport": "streamable-http",
        "auth_type": "none",
    }
    resp = client.post("/api/mcps", json=body, headers=AUTH)
    assert resp.status_code == 201, resp.text
    created = resp.json()
    assert created["name"] == "my-mcp"
    assert created["display_name"] == "My MCP"
    assert created["source"] == "external"
    assert created["created_at"]
    assert created["updated_at"]

    # Now it shows up in the list
    resp = client.get("/api/mcps", headers=AUTH)
    assert resp.status_code == 200
    mcps = resp.json()["mcps"]
    assert len(mcps) == 1
    assert mcps[0]["name"] == "my-mcp"
    assert mcps[0]["display_name"] == "My MCP"
    assert mcps[0]["endpoint_url"] == "https://example.com/mcp"
    assert mcps[0]["transport"] == "streamable-http"
    assert mcps[0]["auth_type"] == "none"


def test_two_tenants_with_same_slug_do_not_collide(client):
    from app.mcps.router import get_mcp_service
    from app.mcps.service import McpService

    # Single store shared by both "tenants" — proves the prefix discipline,
    # not a store that magically knows about tenancy.
    store = _InMemoryStore()
    svc = McpService(store=store)
    app.dependency_overrides[get_mcp_service] = lambda: svc

    body = {
        "name": "shared-slug",
        "display_name": "Shared",
        "description": "Both tenants pick this name.",
        "endpoint_url": "https://example.com/mcp",
        "transport": "streamable-http",
        "auth_type": "none",
    }
    try:
        # Tenant A posts
        app.dependency_overrides[get_current_user] = lambda: _admin("tenant-a")
        resp_a_post = client.post("/api/mcps", json={**body, "display_name": "A's"}, headers=AUTH)
        assert resp_a_post.status_code == 201

        # Tenant B posts with the same slug — should succeed, not conflict
        app.dependency_overrides[get_current_user] = lambda: _admin("tenant-b")
        resp_b_post = client.post("/api/mcps", json={**body, "display_name": "B's"}, headers=AUTH)
        assert resp_b_post.status_code == 201

        # Each tenant only sees its own
        app.dependency_overrides[get_current_user] = lambda: _admin("tenant-a")
        list_a = client.get("/api/mcps", headers=AUTH).json()["mcps"]
        assert [m["display_name"] for m in list_a] == ["A's"]

        app.dependency_overrides[get_current_user] = lambda: _admin("tenant-b")
        list_b = client.get("/api/mcps", headers=AUTH).json()["mcps"]
        assert [m["display_name"] for m in list_b] == ["B's"]
    finally:
        app.dependency_overrides.clear()


def test_skill_user_cannot_create_mcp(client):
    from app.mcps.router import get_mcp_service
    from app.mcps.service import McpService

    svc = McpService(store=_InMemoryStore())
    app.dependency_overrides[get_current_user] = lambda: _read_only()
    app.dependency_overrides[get_mcp_service] = lambda: svc
    try:
        body = {
            "name": "blocked-mcp",
            "display_name": "Blocked",
            "description": "SkillUser should not be able to create this.",
            "endpoint_url": "https://example.com/mcp",
            "transport": "streamable-http",
            "auth_type": "none",
        }
        resp = client.post("/api/mcps", json=body, headers=AUTH)
        assert resp.status_code == 403

        # But list (read) is allowed for SkillUser
        resp = client.get("/api/mcps", headers=AUTH)
        assert resp.status_code == 200
        assert resp.json() == {"mcps": []}
    finally:
        app.dependency_overrides.clear()


def test_duplicate_slug_in_same_tenant_returns_409(client, as_admin):
    body = {
        "name": "dup-mcp",
        "display_name": "First",
        "description": "First registration.",
        "endpoint_url": "https://example.com/mcp",
        "transport": "streamable-http",
        "auth_type": "none",
    }
    assert client.post("/api/mcps", json=body, headers=AUTH).status_code == 201

    # Second POST with the same slug in the same tenant should 409
    resp = client.post("/api/mcps", json={**body, "display_name": "Second"}, headers=AUTH)
    assert resp.status_code == 409

    # And the first registration should remain untouched (not overwritten)
    mcps = client.get("/api/mcps", headers=AUTH).json()["mcps"]
    assert len(mcps) == 1
    assert mcps[0]["display_name"] == "First"


@pytest.mark.parametrize(
    "invalid_name",
    [
        "Uppercase",       # uppercase not allowed
        "-leading-hyphen", # cannot start with hyphen
        "trailing-",       # cannot end with hyphen
        "has spaces",      # no spaces
        "under_score",     # no underscores
        "a" * 65,          # too long (>64)
    ],
)
def test_invalid_slug_returns_422(client, as_admin, invalid_name):
    body = {
        "name": invalid_name,
        "display_name": "X",
        "description": "desc",
        "endpoint_url": "https://example.com/mcp",
        "transport": "streamable-http",
        "auth_type": "none",
    }
    resp = client.post("/api/mcps", json=body, headers=AUTH)
    assert resp.status_code == 422, f"{invalid_name!r} should be rejected, got {resp.status_code}"


@pytest.mark.parametrize(
    "url,expected",
    [
        ("https://example.com/mcp", 201),
        ("https://example.com", 201),
        ("http://localhost:3000/mcp", 201),
        ("http://127.0.0.1/mcp", 201),
        ("http://example.com/mcp", 422),        # plain-http disallowed except localhost
        ("ftp://example.com/mcp", 422),         # non-http(s) scheme
        ("not-a-url", 422),                     # not a URL at all
        ("http://127.0.0.2/mcp", 422),          # only the loopback /8 entry point
    ],
)
def test_endpoint_url_validation(client, as_admin, url, expected):
    # Use a fresh slug each time so duplicate-check doesn't interfere
    body = {
        "name": f"u-{abs(hash(url)) % 100000}",
        "display_name": "X",
        "description": "desc",
        "endpoint_url": url,
        "transport": "streamable-http",
        "auth_type": "none",
    }
    resp = client.post("/api/mcps", json=body, headers=AUTH)
    assert resp.status_code == expected, f"{url!r} expected {expected}, got {resp.status_code}: {resp.text}"


@pytest.mark.parametrize(
    "field,bad_value",
    [
        ("transport", "websocket"),
        ("transport", ""),
        ("auth_type", "basic"),
        ("auth_type", "oauth2"),
    ],
)
def test_unknown_enum_value_returns_422(client, as_admin, field, bad_value):
    body = {
        "name": "enum-test",
        "display_name": "X",
        "description": "desc",
        "endpoint_url": "https://example.com/mcp",
        "transport": "streamable-http",
        "auth_type": "none",
    }
    body[field] = bad_value
    resp = client.post("/api/mcps", json=body, headers=AUTH)
    assert resp.status_code == 422, f"{field}={bad_value!r} should be rejected"


def test_source_platform_authored_is_rejected_in_this_slice(client, as_admin):
    """PRD #14: the schema allows `source: external | platform_authored` so the
    future one-click-deploy slice (MCP-2) doesn't need a migration, but this
    slice only accepts external registrations. `platform_authored` must 422.
    """
    body = {
        "name": "src-test",
        "display_name": "X",
        "description": "desc",
        "endpoint_url": "https://example.com/mcp",
        "transport": "streamable-http",
        "auth_type": "none",
        "source": "platform_authored",
    }
    resp = client.post("/api/mcps", json=body, headers=AUTH)
    assert resp.status_code == 422

    # Explicit source="external" is fine, equivalent to omitting it
    body["source"] = "external"
    assert client.post("/api/mcps", json=body, headers=AUTH).status_code == 201
