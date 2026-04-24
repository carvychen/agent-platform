"""Smoke tests for the Coming Soon stub hubs.

Slice 2 (#4) ships MCP, Prompt, and Agent hubs as 501 stubs with a stable
JSON contract so the frontend can depend on it while real CRUD is built out
in future slices. These tests pin the contract.
"""

EXPECTED_TRACKING_URL = "https://github.com/carvychen/agent-platform/issues/1"


def _assert_coming_soon(response, expected_module: str) -> None:
    assert response.status_code == 501
    body = response.json()
    assert set(body.keys()) == {"status_code", "module", "detail", "tracking"}
    assert body["status_code"] == 501
    assert body["module"] == expected_module
    assert isinstance(body["detail"], str) and body["detail"]
    assert body["tracking"] == EXPECTED_TRACKING_URL


def test_mcps_hub_returns_coming_soon(client):
    response = client.get("/api/mcps")
    _assert_coming_soon(response, expected_module="mcps")


def test_prompts_hub_returns_coming_soon(client):
    response = client.get("/api/prompts")
    _assert_coming_soon(response, expected_module="prompts")


def test_agents_hub_returns_coming_soon(client):
    response = client.get("/api/agents")
    _assert_coming_soon(response, expected_module="agents")
