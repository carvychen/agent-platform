"""Azure Functions entry point (Python v2 programming model).

Bootstraps the MCP-server ASGI app and, unless `ENABLE_AGENT=false`,
also mounts the agent (Microsoft Agent Framework) at /api/chat.
Authentication (Azure Easy Auth) is configured at the Function App level by
the Bicep in Slice 9 (#11); this layer just forwards the inbound
`Authorization: Bearer <user-jwt>` header to OBO and into the agent.

Per ADR 0002 the MCP SDK is self-hosted on an HTTP trigger, not the preview
Functions MCP extension. Per ADR 0004 the agent talks to the MCP
server over HTTP even when co-located (via AF's `MCPStreamableHTTPTool`).

The full ASGI composition (prod safety check, deps, optional agent) lives in
`src/shared/bootstrap.py` so `scripts/run_local.py` can compose the exact same
app under uvicorn. This module is a thin Functions-SDK wrapper around it.
"""
from __future__ import annotations

import sys
from pathlib import Path

# Azure Functions runs this file from the repo root. Expose `src/` on sys.path
# so module imports match the layout used in tests.
_SRC = Path(__file__).parent / "src"
if str(_SRC) not in sys.path:
    sys.path.insert(0, str(_SRC))

import azure.functions as func  # noqa: E402

from shared.bootstrap import build_asgi_app  # noqa: E402
from shared.flex_asgi import FlexAsgiFunctionApp  # noqa: E402


# FlexAsgiFunctionApp — not func.AsgiFunctionApp — works around a leading-slash
# bug in the SDK's registered route template. See src/shared/flex_asgi.py.
app = FlexAsgiFunctionApp(
    app=build_asgi_app(),
    http_auth_level=func.AuthLevel.ANONYMOUS,
)
