"""Unit tests for app.core.blob_layout — the single source of truth for
Hub artifact blob paths.

These tests encode the path schema as assertions. They cover both the
symmetric (target) layout that every Hub will use post-cutover, and the
legacy skills layout that this refactor temporarily preserves (removed
in PRD #31 slice #5 / issue #36).
"""

import pytest

from app.core import blob_layout


def test_tenant_prefix_is_tid_with_trailing_slash():
    assert blob_layout.tenant_prefix("tenant-a") == "tenant-a/"


def test_hub_prefix_symmetric_for_non_legacy_hubs():
    assert blob_layout.hub_prefix("tenant-a", "mcps") == "tenant-a/mcps/"
    assert blob_layout.hub_prefix("tenant-a", "prompts") == "tenant-a/prompts/"
    assert blob_layout.hub_prefix("tenant-a", "agents") == "tenant-a/agents/"


def test_hub_prefix_collapses_to_tenant_prefix_for_legacy_skills():
    """Skills data is currently laid out as {tid}/<skill-name>/... without a
    hub namespace. This compat shim is removed in issue #36 after migration."""
    assert blob_layout.hub_prefix("tenant-a", "skills") == "tenant-a/"


# ---- artifact_prefix ----------------------------------------------------


def test_artifact_prefix_symmetric_hub():
    assert blob_layout.artifact_prefix("tenant-a", "mcps", "my-mcp") == "tenant-a/mcps/my-mcp/"


def test_artifact_prefix_legacy_skills_omits_hub_segment():
    assert blob_layout.artifact_prefix("tenant-a", "skills", "crm") == "tenant-a/crm/"


# ---- file_path ----------------------------------------------------------


def test_file_path_symmetric_hub_nested():
    assert (
        blob_layout.file_path("tenant-a", "mcps", "my-mcp", "scripts/run.py")
        == "tenant-a/mcps/my-mcp/scripts/run.py"
    )


def test_file_path_legacy_skills_nested():
    assert (
        blob_layout.file_path("tenant-a", "skills", "crm", "SKILL.md")
        == "tenant-a/crm/SKILL.md"
    )


def test_file_path_empty_sub_returns_artifact_prefix():
    """Passing an empty sub-path yields the artifact directory itself — a
    useful affordance when building blob listing prefixes."""
    assert blob_layout.file_path("tenant-a", "mcps", "my-mcp", "") == "tenant-a/mcps/my-mcp/"


# ---- metadata_path ------------------------------------------------------


def test_metadata_path_points_inside_artifact():
    assert (
        blob_layout.metadata_path("tenant-a", "mcps", "my-mcp")
        == "tenant-a/mcps/my-mcp/metadata.json"
    )


# ---- validation ---------------------------------------------------------


@pytest.mark.parametrize("bad_hub", ["", None])
def test_hub_prefix_rejects_empty_hub(bad_hub):
    with pytest.raises((ValueError, TypeError)):
        blob_layout.hub_prefix("tenant-a", bad_hub)


@pytest.mark.parametrize("bad_name", ["", None])
def test_artifact_prefix_rejects_empty_name(bad_name):
    with pytest.raises((ValueError, TypeError)):
        blob_layout.artifact_prefix("tenant-a", "mcps", bad_name)
