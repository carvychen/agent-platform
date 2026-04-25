"""Single source of truth for Hub artifact blob paths.

Every Hub in the admin plane — Skill, MCP, future Prompt and Agent Hubs —
stores artifacts in the same Azure Blob container, separated by tenant
prefix and (in the target layout) by hub namespace. This module is the
ONLY place those path rules are expressed.

## Target layout (symmetric)

    {tid}/<hub>/<artifact-name>/<sub-path>

e.g. `tenant-42/mcps/my-mcp/metadata.json` or
     `tenant-42/skills/crm-opportunity/SKILL.md` (post-cutover).

## Legacy layout (skills only, transitional)

Skills today live directly under the tenant prefix with no hub
namespace:

    {tid}/<skill-name>/<sub-path>

This module preserves that shape for `hub="skills"` via `_LEGACY_HUBS`
until PRD #31 slice #4 (issue #35) migrates the data. After that, slice
#5 (issue #36) removes the compat shim — one line.

Do NOT add special cases at call sites. All legacy behavior lives here.
"""

_LEGACY_HUBS = {"skills"}  # removed in PRD #31 slice #5 (issue #36)


def tenant_prefix(tenant_id: str) -> str:
    """Top-level virtual directory for a tenant, always ending with `/`."""
    return f"{tenant_id}/"


def hub_prefix(tenant_id: str, hub: str) -> str:
    """Prefix containing every artifact of a given Hub, always ending with `/`.

    For legacy skills (hub="skills"), this collapses to the tenant prefix
    because skill data isn't namespaced under a `skills/` folder today.
    """
    if not hub:
        raise ValueError("hub must be a non-empty string")
    if hub in _LEGACY_HUBS:
        return tenant_prefix(tenant_id)
    return f"{tenant_id}/{hub}/"


def artifact_prefix(tenant_id: str, hub: str, name: str) -> str:
    """Prefix owning all blobs of one artifact, always ending with `/`."""
    if not name:
        raise ValueError("artifact name must be a non-empty string")
    return f"{hub_prefix(tenant_id, hub)}{name}/"


def file_path(tenant_id: str, hub: str, name: str, sub_path: str) -> str:
    """Full blob path for a file inside an artifact. `sub_path` may be empty,
    in which case the artifact prefix is returned as-is (useful for listings)."""
    if sub_path is None:
        raise ValueError("sub_path must be a string (use '' for the artifact prefix)")
    return f"{artifact_prefix(tenant_id, hub, name)}{sub_path}"


def metadata_path(tenant_id: str, hub: str, name: str) -> str:
    """Canonical path for the single `metadata.json` a JSON-pattern Hub writes
    per artifact (MCP today; future Prompt/Agent). Multi-file Hubs (Skill)
    don't use this."""
    return file_path(tenant_id, hub, name, "metadata.json")
