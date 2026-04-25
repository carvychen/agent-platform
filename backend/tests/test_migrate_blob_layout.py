"""Integration tests for scripts/migrate_blob_layout.py.

Uses an in-memory `BlobBytesStore` substitute so no Azure dependency is
required. Covers the planner (pure) and the execute loop (impure but
isolated via the Protocol).
"""

import sys
from pathlib import Path

import pytest

# Make `scripts/` importable by these tests — it's NOT in the production
# import graph, only the test suite reaches into it.
_SCRIPTS_DIR = Path(__file__).resolve().parents[1] / "scripts"
if str(_SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(_SCRIPTS_DIR))

from migrate_blob_layout import (  # noqa: E402
    Migration,
    execute_one,
    plan_migration,
    run_migration,
)


class _InMemoryBytesStore:
    """Satisfies the `BlobBytesStore` Protocol used by the migration script."""

    def __init__(self, initial: dict[str, bytes] | None = None):
        self._data: dict[str, bytes] = dict(initial or {})

    def list_names(self, prefix: str) -> list[str]:
        return [p for p in self._data if p.startswith(prefix)]

    def exists(self, path: str) -> bool:
        return path in self._data

    def read_bytes(self, path: str) -> bytes:
        return self._data[path]

    def write_bytes(self, path: str, data: bytes) -> None:
        self._data[path] = data

    def delete(self, path: str) -> None:
        self._data.pop(path, None)


# ---------------------------------------------------------------------------
# planner tests
# ---------------------------------------------------------------------------


def test_planner_maps_skill_blobs_to_symmetric_target():
    """Two tenants × one skill each, multi-file. Planner produces one
    Migration per source blob, with the correct target path."""
    paths = [
        "tenant-a/crm/SKILL.md",
        "tenant-a/crm/scripts/run.py",
        "tenant-b/data-processor/SKILL.md",
    ]
    migrations = plan_migration(paths, tenant_filter=None)

    # Sorted by source path so the test is stable
    by_source = {m.source_path: m for m in migrations}
    assert set(by_source.keys()) == set(paths)

    m = by_source["tenant-a/crm/SKILL.md"]
    assert m.target_path == "tenant-a/skills/crm/SKILL.md"
    assert m.tenant_id == "tenant-a"
    assert m.skill_name == "crm"
    assert m.sub_path == "SKILL.md"

    m = by_source["tenant-a/crm/scripts/run.py"]
    assert m.target_path == "tenant-a/skills/crm/scripts/run.py"
    assert m.sub_path == "scripts/run.py"


def test_planner_skips_mcp_prompt_agent_namespaces():
    paths = [
        "tenant-a/mcps/my-mcp/metadata.json",
        "tenant-a/prompts/some-prompt/metadata.json",
        "tenant-a/agents/agent-x/metadata.json",
        "tenant-a/real-skill/SKILL.md",
    ]
    migrations = plan_migration(paths, tenant_filter=None)
    # Only the real skill is a migration candidate
    assert len(migrations) == 1
    assert migrations[0].skill_name == "real-skill"


def test_planner_skips_blobs_already_at_target_layout():
    paths = [
        "tenant-a/skills/already-migrated/SKILL.md",
        "tenant-a/legacy-skill/SKILL.md",
    ]
    migrations = plan_migration(paths, tenant_filter=None)
    assert len(migrations) == 1
    assert migrations[0].skill_name == "legacy-skill"


def test_planner_tenant_filter_scopes_to_one_tenant():
    paths = [
        "tenant-a/skill-1/SKILL.md",
        "tenant-b/skill-2/SKILL.md",
        "tenant-c/skill-3/SKILL.md",
    ]
    migrations = plan_migration(paths, tenant_filter="tenant-b")
    assert len(migrations) == 1
    assert migrations[0].tenant_id == "tenant-b"


def test_planner_ignores_malformed_paths():
    """Root-level blobs or tenant-prefix-only blobs (no artifact segment)
    are skipped, not errored."""
    paths = [
        "root-file",
        "tenant-a/",
        "tenant-a/crm/SKILL.md",
    ]
    migrations = plan_migration(paths, tenant_filter=None)
    assert [m.source_path for m in migrations] == ["tenant-a/crm/SKILL.md"]


# ---------------------------------------------------------------------------
# execute_one tests — per-blob copy / verify / delete dance
# ---------------------------------------------------------------------------


def _m(tid: str = "tenant-a", skill: str = "crm", sub: str = "SKILL.md") -> Migration:
    return Migration(
        source_path=f"{tid}/{skill}/{sub}",
        target_path=f"{tid}/skills/{skill}/{sub}",
        tenant_id=tid,
        skill_name=skill,
        sub_path=sub,
    )


def test_execute_dry_run_does_not_mutate_store():
    store = _InMemoryBytesStore({"tenant-a/crm/SKILL.md": b"content"})
    status = execute_one(store, _m(), dry_run=True)
    assert status == "DRY-RUN"
    # Store unchanged
    assert store._data == {"tenant-a/crm/SKILL.md": b"content"}


def test_execute_happy_path_copies_verifies_deletes():
    store = _InMemoryBytesStore({"tenant-a/crm/SKILL.md": b"content"})
    status = execute_one(store, _m(), dry_run=False)
    assert status == "MIGRATED"
    # Source gone, target present, bytes preserved
    assert "tenant-a/crm/SKILL.md" not in store._data
    assert store._data["tenant-a/skills/crm/SKILL.md"] == b"content"


def test_execute_crash_recovery_target_exists_with_matching_bytes():
    """Simulates a crash between write-target (step 2) and delete-source
    (step 4): target has correct bytes, source is still there. Rerun
    should verify and delete source."""
    store = _InMemoryBytesStore({
        "tenant-a/crm/SKILL.md": b"content",
        "tenant-a/skills/crm/SKILL.md": b"content",
    })
    status = execute_one(store, _m(), dry_run=False)
    assert status == "MIGRATED"
    assert "tenant-a/crm/SKILL.md" not in store._data
    assert store._data["tenant-a/skills/crm/SKILL.md"] == b"content"


def test_execute_crash_recovery_target_exists_with_different_bytes():
    """Target present but does NOT match source — ambiguous, do not delete."""
    store = _InMemoryBytesStore({
        "tenant-a/crm/SKILL.md": b"newer content",
        "tenant-a/skills/crm/SKILL.md": b"older content",
    })
    status = execute_one(store, _m(), dry_run=False)
    assert status == "VERIFY_FAILED"
    # Both paths still there — nothing deleted
    assert store._data["tenant-a/crm/SKILL.md"] == b"newer content"
    assert store._data["tenant-a/skills/crm/SKILL.md"] == b"older content"


def test_execute_second_run_on_completed_migration_is_noop():
    """Source already gone, target has the bytes. Plan shouldn't produce
    this migration (planner skips it), but if it somehow reaches
    execute_one, it should no-op gracefully."""
    store = _InMemoryBytesStore({"tenant-a/skills/crm/SKILL.md": b"content"})
    status = execute_one(store, _m(), dry_run=False)
    assert status == "NO_SOURCE"
    # Target untouched
    assert store._data == {"tenant-a/skills/crm/SKILL.md": b"content"}


# ---------------------------------------------------------------------------
# run_migration — driver that plans + executes + logs
# ---------------------------------------------------------------------------


def _seed_mixed_store() -> _InMemoryBytesStore:
    """Two tenants × multiple skills + one MCP that should NOT be touched."""
    return _InMemoryBytesStore({
        "tenant-a/crm/SKILL.md": b"crm-content",
        "tenant-a/crm/scripts/run.py": b"run-py-content",
        "tenant-a/data-proc/SKILL.md": b"data-content",
        "tenant-b/crm/SKILL.md": b"b-crm-content",
        "tenant-a/mcps/my-mcp/metadata.json": b'{"name":"my-mcp"}',
    })


def test_driver_full_e2e_migrates_all_skills_leaves_mcps_alone(capsys):
    store = _seed_mixed_store()
    exit_code = run_migration(store, tenant_filter=None, dry_run=False)
    assert exit_code == 0

    # All 4 skill blobs migrated
    for expected_target in [
        "tenant-a/skills/crm/SKILL.md",
        "tenant-a/skills/crm/scripts/run.py",
        "tenant-a/skills/data-proc/SKILL.md",
        "tenant-b/skills/crm/SKILL.md",
    ]:
        assert expected_target in store._data

    # All 4 source paths removed
    for removed_source in [
        "tenant-a/crm/SKILL.md",
        "tenant-a/crm/scripts/run.py",
        "tenant-a/data-proc/SKILL.md",
        "tenant-b/crm/SKILL.md",
    ]:
        assert removed_source not in store._data

    # MCP blob untouched — path preserved, bytes preserved
    assert store._data["tenant-a/mcps/my-mcp/metadata.json"] == b'{"name":"my-mcp"}'

    # Log contains MIGRATED lines with audit fields
    out = capsys.readouterr().out
    assert "MIGRATED" in out
    assert "tenant=tenant-a" in out
    assert "skill=crm" in out


def test_driver_second_run_is_silent_no_op():
    store = _seed_mixed_store()
    assert run_migration(store, tenant_filter=None, dry_run=False) == 0

    snapshot = dict(store._data)
    # Second run — no source paths remain, so no migrations happen
    assert run_migration(store, tenant_filter=None, dry_run=False) == 0
    assert store._data == snapshot


def test_driver_dry_run_does_not_mutate_store_and_prints_plan(capsys):
    store = _seed_mixed_store()
    exit_code = run_migration(store, tenant_filter=None, dry_run=True)
    assert exit_code == 0

    # Nothing moved
    assert "tenant-a/crm/SKILL.md" in store._data
    assert "tenant-a/skills/crm/SKILL.md" not in store._data

    # Log shows DRY-RUN entries
    out = capsys.readouterr().out
    assert "DRY-RUN" in out
    # All 4 skill blobs listed
    assert out.count("DRY-RUN") == 4


def test_driver_verify_failure_continues_and_exits_nonzero():
    """If any blob fails verification, the driver keeps going but exits
    non-zero so operator catches it."""
    # Crash-recovery case: target exists with WRONG bytes for one skill,
    # but the other skill is virgin and should migrate cleanly.
    store = _InMemoryBytesStore({
        "tenant-a/bad-skill/SKILL.md": b"source-bytes",
        "tenant-a/skills/bad-skill/SKILL.md": b"CORRUPTED-target-bytes",
        "tenant-a/good-skill/SKILL.md": b"good-content",
    })
    exit_code = run_migration(store, tenant_filter=None, dry_run=False)

    # Non-zero exit
    assert exit_code != 0

    # Good skill was migrated
    assert store._data["tenant-a/skills/good-skill/SKILL.md"] == b"good-content"
    assert "tenant-a/good-skill/SKILL.md" not in store._data

    # Bad skill source preserved
    assert store._data["tenant-a/bad-skill/SKILL.md"] == b"source-bytes"


def test_driver_tenant_filter_scopes_migration():
    store = _InMemoryBytesStore({
        "tenant-a/skill-1/SKILL.md": b"a-content",
        "tenant-b/skill-2/SKILL.md": b"b-content",
    })
    run_migration(store, tenant_filter="tenant-a", dry_run=False)
    # Only tenant-a moved
    assert "tenant-a/skills/skill-1/SKILL.md" in store._data
    assert "tenant-b/skill-2/SKILL.md" in store._data  # untouched
    assert "tenant-b/skills/skill-2/SKILL.md" not in store._data
