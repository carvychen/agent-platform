"""Shared bootstrap for the Azure Functions entry (`function_app.py`) and
the local-dev entry (`scripts/run_local.py`).

Both entry points compose the same ASGI application — MCP server + optional
agent at `/api/chat` — but against different runtime hosts. Extracting the
factory logic here means the two paths cannot drift: whatever boots the MCP
server and the agent in production also boots them under uvicorn on a laptop.

No top-level side effects: importing this module must not construct
`DefaultAzureCredential`, read env vars, or open network handles. Callers
invoke the factory functions when they are ready to boot.
"""
from __future__ import annotations

import os
from pathlib import Path

import httpx
from azure.identity import DefaultAzureCredential
from starlette.applications import Starlette

from mcp_server import ServerDeps
from shared.asgi import create_asgi_app
from shared.auth import build_auth
from shared.config import get_config
from shared.dataverse_client import OpportunityClient


def agent_enabled() -> bool:
    """Return True unless `ENABLE_AGENT=false` (case-insensitive)."""
    return os.environ.get("ENABLE_AGENT", "true").strip().lower() != "false"


def require_env(name: str) -> str:
    """Return the value of `name` in the environment; raise `EnvironmentError`
    if it is missing or empty. Empty values are treated as missing so that a
    stray `EXPORT X=` line in an operator's `.env` fails loudly at boot rather
    than crashing later during token exchange."""
    value = os.environ.get(name, "").strip()
    if not value:
        raise EnvironmentError(f"Missing required environment variable: {name}")
    return value


def prod_safety_check() -> None:
    """Refuse to boot a production Function App under `AUTH_MODE=app_only_secret`.

    ADR 0007 permits the client-secret path for dev / CI integration only.
    Production must use OBO+WIF (ADR 0001). The Azure Functions runtime sets
    `AZURE_FUNCTIONS_ENVIRONMENT=Production` by default on deployed slots, so
    this check is a no-op locally.
    """
    env = os.environ.get("AZURE_FUNCTIONS_ENVIRONMENT", "").strip().lower()
    mode = os.environ.get("AUTH_MODE", "obo").strip().lower()
    if env == "production" and mode == "app_only_secret":
        raise RuntimeError(
            "AUTH_MODE=app_only_secret is forbidden in production "
            "(AZURE_FUNCTIONS_ENVIRONMENT=Production). Set AUTH_MODE=obo and "
            "configure WIF + Managed Identity per ADR 0001."
        )


def create_credential() -> DefaultAzureCredential:
    """Build a `DefaultAzureCredential` that picks the right Managed Identity.

    On a Function App with only a User-Assigned MI (no system MI),
    `DefaultAzureCredential()` with no args falls back to the absent system
    identity and fails. Passing the UAMI's client ID explicitly tells the SDK
    which identity to target. `MANAGED_IDENTITY_CLIENT_ID` is published by
    `infra/main.bicep` from the MI module's `clientId` output.

    Returns a plain `DefaultAzureCredential()` when the env var is absent —
    that keeps local dev (az login, no MI) and tests (with stub credentials)
    working unchanged.
    """
    mi_client_id = os.environ.get("MANAGED_IDENTITY_CLIENT_ID", "").strip()
    if mi_client_id:
        return DefaultAzureCredential(managed_identity_client_id=mi_client_id)
    return DefaultAzureCredential()


def create_mcp_server_deps() -> ServerDeps:
    """Compose `ServerDeps` from env + credentials — same bootstrap both
    Azure Functions and the local uvicorn entry use."""
    config = get_config()
    http = httpx.AsyncClient(timeout=httpx.Timeout(30.0))
    credential = create_credential()
    fic_scope = f"{config.fic_audience}/.default"

    def _mi_token() -> str:
        return credential.get_token(fic_scope).token

    return ServerDeps(
        auth=build_auth(config, http=http, mi_token_provider=_mi_token),
        client=OpportunityClient(config.dataverse_url, http=http),
    )


def create_agent():
    """Compose the AF-based agent. Delayed-import because the heavy
    `agent_framework` deps should only load when the agent is enabled."""
    from agent.builder import build_agent
    from agent.prompts.loader import PromptLoader

    prompts_dir = Path(__file__).resolve().parent.parent / "agent" / "prompts"
    llm_provider = os.environ.get("LLM_PROVIDER", "foundry").strip().lower()
    return build_agent(
        llm_provider=llm_provider,
        project_endpoint=os.environ.get("FOUNDRY_PROJECT_ENDPOINT", ""),
        model=os.environ.get("FOUNDRY_MODEL", "gpt-4o-mini"),
        azure_openai_endpoint=os.environ.get("AZURE_OPENAI_ENDPOINT"),
        azure_openai_api_version=os.environ.get(
            "AZURE_OPENAI_API_VERSION", "2024-10-21"
        ),
        mcp_url=require_env("MCP_SERVER_URL"),
        prompts=PromptLoader(prompts_dir=prompts_dir),
        credential=create_credential(),
    )


def build_asgi_app() -> Starlette:
    """Top-level factory: apply the production safety check, compose
    `ServerDeps`, optionally compose the agent, and return the ASGI app
    mounting `/mcp` and (when enabled) `/api/chat`.

    Called by both `function_app.py` (wrapped in `FlexAsgiFunctionApp`) and
    `scripts/run_local.py` (handed to `uvicorn.run`)."""
    prod_safety_check()
    deps = create_mcp_server_deps()
    agent = create_agent() if agent_enabled() else None
    return create_asgi_app(deps, agent=agent)
