from typing import Literal
from urllib.parse import urlparse

from pydantic import BaseModel, Field, field_validator

Transport = Literal["streamable-http", "sse", "stdio"]
AuthType = Literal["none", "bearer_static", "oauth_bearer_from_host"]


# Slug rule: lowercase letters, digits, hyphens; must not start or end with a hyphen.
# Matches the skill-name regex in app/skills/validator.py so admins see consistent
# validation across hubs.
NAME_PATTERN = r"^[a-z0-9]([a-z0-9-]*[a-z0-9])?$"

# Plain-http endpoints are only accepted for loopback, so local dev can point
# at an in-process MCP server without needing to terminate TLS.
_LOCAL_HOSTS = {"localhost", "127.0.0.1"}


def _validate_endpoint_url(value: str) -> str:
    parsed = urlparse(value)
    if parsed.scheme not in {"http", "https"}:
        raise ValueError("endpoint_url must use http or https scheme")
    if not parsed.hostname:
        raise ValueError("endpoint_url must include a hostname")
    if parsed.scheme == "http" and parsed.hostname not in _LOCAL_HOSTS:
        raise ValueError("http is only allowed for localhost / 127.0.0.1; use https otherwise")
    return value


class McpCreateRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=64, pattern=NAME_PATTERN)
    display_name: str = Field(..., min_length=1, max_length=80)
    description: str = Field(..., min_length=1, max_length=500)
    endpoint_url: str = Field(..., min_length=1)
    transport: Transport = "streamable-http"
    auth_type: AuthType = "none"
    # `platform_authored` is the forward-compat slot for MCP-2 (one-click deploy);
    # this slice only admits external registrations.
    source: Literal["external"] = "external"
    metadata: dict[str, str] | None = None

    @field_validator("endpoint_url")
    @classmethod
    def _check_endpoint_url(cls, v: str) -> str:
        return _validate_endpoint_url(v)


class McpResponse(BaseModel):
    name: str
    display_name: str
    description: str
    endpoint_url: str
    transport: Transport
    auth_type: AuthType
    source: Literal["external"] = "external"
    metadata: dict[str, str] | None = None
    created_at: str
    updated_at: str


class McpListResponse(BaseModel):
    mcps: list[McpResponse]
