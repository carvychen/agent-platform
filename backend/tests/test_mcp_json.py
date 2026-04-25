"""Unit tests for the pure `build_mcp_json` helper.

No HTTP, no Blob, no dependencies — just dict in, dict out. This file
parametrizes every transport × auth_type combination so the shape
contract is documented as a test, not prose.
"""

import pytest

from app.mcps.mcp_json import build_mcp_json


def _mcp(
    *,
    name: str = "my-mcp",
    url: str = "https://example.com/mcp",
    transport: str = "streamable-http",
    auth_type: str = "none",
) -> dict:
    return {
        "name": name,
        "display_name": "My MCP",
        "description": "desc",
        "endpoint_url": url,
        "transport": transport,
        "auth_type": auth_type,
        "source": "external",
        "metadata": None,
        "created_at": "2026-01-01T00:00:00+00:00",
        "updated_at": "2026-01-01T00:00:00+00:00",
    }


def test_streamable_http_none_minimal_shape():
    result = build_mcp_json(_mcp())
    assert result == {
        "mcpServers": {
            "my-mcp": {
                "type": "streamable-http",
                "url": "https://example.com/mcp",
            }
        }
    }


def test_sse_none_uses_sse_type():
    result = build_mcp_json(_mcp(transport="sse"))
    assert result["mcpServers"]["my-mcp"]["type"] == "sse"
    assert result["mcpServers"]["my-mcp"]["url"] == "https://example.com/mcp"
    assert "_note" not in result["mcpServers"]["my-mcp"]


def test_bearer_static_adds_note_explaining_client_side_token():
    result = build_mcp_json(_mcp(auth_type="bearer_static"))
    entry = result["mcpServers"]["my-mcp"]
    assert "_note" in entry
    assert "bearer" in entry["_note"].lower()
    assert "client" in entry["_note"].lower() or "secret" in entry["_note"].lower()
    # Core shape still present
    assert entry["type"] == "streamable-http"
    assert entry["url"] == "https://example.com/mcp"


def test_oauth_bearer_from_host_adds_distinct_note_explaining_host_oauth():
    result = build_mcp_json(_mcp(auth_type="oauth_bearer_from_host"))
    entry = result["mcpServers"]["my-mcp"]
    assert "_note" in entry
    assert "oauth" in entry["_note"].lower()
    assert "host" in entry["_note"].lower()
    # And it differs from the static-bearer note
    static_note = build_mcp_json(_mcp(auth_type="bearer_static"))["mcpServers"]["my-mcp"]["_note"]
    assert entry["_note"] != static_note


def test_stdio_returns_command_args_shape_with_placeholder_and_note():
    """stdio MCPs require a local binary; the platform can't distribute it,
    so the snippet is a template the user must edit."""
    result = build_mcp_json(_mcp(transport="stdio", auth_type="none"))
    entry = result["mcpServers"]["my-mcp"]
    # stdio shape — NOT "type"/"url"; uses "command"/"args"
    assert "type" not in entry
    assert "url" not in entry
    assert "command" in entry
    assert "args" in entry
    assert isinstance(entry["args"], list)
    # Note always present for stdio (even with auth_type=none), explaining the placeholder
    assert "_note" in entry
    assert "stdio" in entry["_note"].lower()
    assert "local" in entry["_note"].lower() or "binary" in entry["_note"].lower()


def test_stdio_with_bearer_static_combines_stdio_and_auth_notes():
    result = build_mcp_json(_mcp(transport="stdio", auth_type="bearer_static"))
    entry = result["mcpServers"]["my-mcp"]
    assert "command" in entry
    assert "stdio" in entry["_note"].lower()
    assert "bearer" in entry["_note"].lower()


def test_stdio_with_oauth_combines_stdio_and_oauth_notes():
    result = build_mcp_json(_mcp(transport="stdio", auth_type="oauth_bearer_from_host"))
    entry = result["mcpServers"]["my-mcp"]
    assert "command" in entry
    assert "stdio" in entry["_note"].lower()
    assert "oauth" in entry["_note"].lower()


def test_mcp_servers_key_is_slug_not_display_name():
    """The mcpServers map key must be the URL-safe slug, not the human-readable display_name."""
    result = build_mcp_json(_mcp(name="crm-prod-001"))
    assert list(result["mcpServers"].keys()) == ["crm-prod-001"]
