"""Local-development entry point: run the crm-agent ASGI app under uvicorn.

    python scripts/run_local.py

Serves the same MCP server + (when `ENABLE_AGENT=true`) `/api/chat` endpoint
that the Azure Function App serves in production, but skips the Azure
Functions runtime — cold start in seconds, no `func` CLI needed. Best for
iterating on prompt / tool logic.

Requires: `.env` at the repo root with `AAD_APP_CLIENT_ID`, `AAD_APP_TENANT_ID`,
`DATAVERSE_URL`, and (if the agent is enabled) `MCP_SERVER_URL` — see
`.env.example`. Also requires `az login` so `DefaultAzureCredential` can
acquire tokens against the Dataverse endpoint.

For full-stack smoke tests (which exercise `FlexAsgiFunctionApp` and the
Functions host), use `func start` with `local.settings.json` instead. See
the Local development section of the README.
"""
from __future__ import annotations

import sys
from pathlib import Path

# Make src/ importable — same trick function_app.py uses.
_SRC = Path(__file__).resolve().parent.parent / "src"
if str(_SRC) not in sys.path:
    sys.path.insert(0, str(_SRC))

from dotenv import load_dotenv  # noqa: E402

_REPO_ROOT = Path(__file__).resolve().parent.parent
_env_file = _REPO_ROOT / ".env"
if _env_file.is_file():
    load_dotenv(_env_file)

import uvicorn  # noqa: E402

from shared.bootstrap import build_asgi_app  # noqa: E402


def main() -> None:
    app = build_asgi_app()
    uvicorn.run(app, host="127.0.0.1", port=8000, log_level="info")


if __name__ == "__main__":
    main()
