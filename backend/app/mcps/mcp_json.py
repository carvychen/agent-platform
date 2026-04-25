"""Builds a ready-to-paste `.mcp.json` snippet from an MCP catalog entry.

This is a pure module — no Blob, no HTTP, no Pydantic. It accepts a plain
dict (the same shape `McpService.get` returns) and produces the dict that
should be serialized and copied to the user's clipboard. Testing is
trivial: parametrize `transport × auth_type` combinations and assert the
resulting shape.

The snippet follows the Claude Desktop / VS Code / Cursor `.mcp.json`
convention: a single top-level `mcpServers` object keyed by the MCP's
slug.
"""


_AUTH_NOTES = {
    "bearer_static": (
        "This MCP requires a Bearer token. Configure it in your client's secret "
        "store; the platform does not distribute the token."
    ),
    "oauth_bearer_from_host": (
        "This MCP uses host-mediated OAuth (same pattern as the reference "
        "crm-agent integration). The client obtains a Bearer token via the host "
        "application and forwards it to the MCP server; the platform does not "
        "issue tokens."
    ),
}

_STDIO_NOTE = (
    "stdio MCPs require a local binary that this platform does not distribute. "
    "Replace <your-local-binary> with the absolute path to the executable on "
    "your machine, and populate args/env as the binary expects."
)


def _join_notes(*notes: str) -> str:
    return "\n\n".join(n for n in notes if n)


def build_mcp_json(mcp: dict) -> dict:
    name = mcp["name"]
    transport = mcp["transport"]
    auth_type = mcp["auth_type"]
    auth_note = _AUTH_NOTES.get(auth_type)

    entry: dict
    if transport == "stdio":
        # stdio uses command/args, not type/url. The platform can't distribute
        # binaries, so the snippet is a template the operator must edit.
        entry = {"command": "<your-local-binary>", "args": []}
        entry["_note"] = _join_notes(_STDIO_NOTE, auth_note or "")
    else:
        entry = {"type": transport, "url": mcp["endpoint_url"]}
        if auth_note:
            entry["_note"] = auth_note

    return {"mcpServers": {name: entry}}
