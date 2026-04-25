"""Tests for src/shared/bootstrap.py — shared bootstrap module used by
both function_app.py (Azure Functions entry) and scripts/run_local.py
(uvicorn local dev entry).

Each helper is tested through the public interface that both entry points
depend on. Import is kept inside each test so monkeypatched env vars take
effect before bootstrap's first read.
"""
from __future__ import annotations

import pytest


def test_agent_enabled_defaults_true_when_env_absent(monkeypatch):
    monkeypatch.delenv("ENABLE_AGENT", raising=False)
    from shared.bootstrap import agent_enabled

    assert agent_enabled() is True


@pytest.mark.parametrize("false_literal", ["false", "FALSE", "False", " false "])
def test_agent_enabled_false_when_env_set_case_insensitive(monkeypatch, false_literal):
    monkeypatch.setenv("ENABLE_AGENT", false_literal)
    from shared.bootstrap import agent_enabled

    assert agent_enabled() is False


@pytest.mark.parametrize("truthy_literal", ["true", "yes", "1", "on", ""])
def test_agent_enabled_true_for_any_non_false_value(monkeypatch, truthy_literal):
    """The contract is 'true unless explicitly false' — not 'true only for
    known truthy strings'. Any unknown value keeps the agent enabled so that
    operators can't silently disable it via a typo."""
    monkeypatch.setenv("ENABLE_AGENT", truthy_literal)
    from shared.bootstrap import agent_enabled

    assert agent_enabled() is True


def test_require_env_returns_value_when_set(monkeypatch):
    monkeypatch.setenv("TEST_BOOTSTRAP_VAR", "hello")
    from shared.bootstrap import require_env

    assert require_env("TEST_BOOTSTRAP_VAR") == "hello"


def test_require_env_raises_when_missing(monkeypatch):
    monkeypatch.delenv("TEST_BOOTSTRAP_VAR_MISSING", raising=False)
    from shared.bootstrap import require_env

    with pytest.raises(EnvironmentError) as exc:
        require_env("TEST_BOOTSTRAP_VAR_MISSING")
    assert "TEST_BOOTSTRAP_VAR_MISSING" in str(exc.value)


def test_require_env_raises_when_empty_string(monkeypatch):
    """Empty values are treated as missing — an operator who exports
    AAD_APP_CLIENT_ID= (with no value) should get a loud error, not
    a silent failure later during token exchange."""
    monkeypatch.setenv("TEST_BOOTSTRAP_VAR_EMPTY", "")
    from shared.bootstrap import require_env

    with pytest.raises(EnvironmentError):
        require_env("TEST_BOOTSTRAP_VAR_EMPTY")


def test_prod_safety_check_raises_when_production_with_client_secret(monkeypatch):
    """ADR 0007: AUTH_MODE=app_only_secret is a dev/CI path. Production
    must use OBO. The Functions runtime sets AZURE_FUNCTIONS_ENVIRONMENT
    to Production automatically."""
    monkeypatch.setenv("AZURE_FUNCTIONS_ENVIRONMENT", "Production")
    monkeypatch.setenv("AUTH_MODE", "app_only_secret")
    from shared.bootstrap import prod_safety_check

    with pytest.raises(RuntimeError) as exc:
        prod_safety_check()
    assert "app_only_secret" in str(exc.value)


def test_prod_safety_check_silent_when_production_uses_obo(monkeypatch):
    monkeypatch.setenv("AZURE_FUNCTIONS_ENVIRONMENT", "Production")
    monkeypatch.setenv("AUTH_MODE", "obo")
    from shared.bootstrap import prod_safety_check

    prod_safety_check()  # does not raise


def test_prod_safety_check_silent_in_dev_regardless_of_auth_mode(monkeypatch):
    """Dev/CI environments (no AZURE_FUNCTIONS_ENVIRONMENT or anything
    other than 'Production') are free to use either auth mode."""
    monkeypatch.delenv("AZURE_FUNCTIONS_ENVIRONMENT", raising=False)
    monkeypatch.setenv("AUTH_MODE", "app_only_secret")
    from shared.bootstrap import prod_safety_check

    prod_safety_check()  # does not raise


def _minimal_env(monkeypatch) -> None:
    """Set the env vars `get_config()` requires so `build_asgi_app` can
    boot without touching any real cloud endpoint."""
    monkeypatch.setenv("CLOUD_ENV", "global")
    monkeypatch.setenv("DATAVERSE_URL", "https://orgtest.crm.dynamics.com")
    monkeypatch.setenv("AAD_APP_CLIENT_ID", "11111111-1111-1111-1111-111111111111")
    monkeypatch.setenv("AAD_APP_TENANT_ID", "22222222-2222-2222-2222-222222222222")
    monkeypatch.delenv("MANAGED_IDENTITY_CLIENT_ID", raising=False)


class _StubCredential:
    """Stand-in for DefaultAzureCredential that avoids touching Entra."""

    def get_token(self, *_scopes, **_kwargs):
        class _Token:
            token = "stub-fic-assertion"
        return _Token()


def test_build_asgi_app_returns_starlette_with_mcp_route_when_agent_disabled(monkeypatch):
    """ENABLE_AGENT=false should boot the MCP server alone — no /api/chat,
    no agent_framework import (so `agent-framework` does not need to be
    installed for this code path)."""
    _minimal_env(monkeypatch)
    monkeypatch.setenv("ENABLE_AGENT", "false")
    # Swap out DefaultAzureCredential before any boot reads it.
    import shared.bootstrap as bootstrap

    monkeypatch.setattr(bootstrap, "DefaultAzureCredential", lambda **_: _StubCredential())

    app = bootstrap.build_asgi_app()

    route_descriptions = [str(r) for r in app.routes]
    assert any("/mcp" in r for r in route_descriptions), (
        f"expected /mcp mount, got {route_descriptions}"
    )
    assert not any("/api/chat" in r for r in route_descriptions), (
        f"/api/chat must be absent when ENABLE_AGENT=false, got {route_descriptions}"
    )
