"""One-shot migration: moves Skill Hub data from the legacy layout
`{tid}/<skill-name>/...` to the target symmetric layout
`{tid}/skills/<skill-name>/...`.

Invariants:

1. Copy FIRST, verify bytes, delete source ONLY on byte parity.
2. Idempotent: rerun is a no-op on already-migrated data; a rerun after
   a crash resumes cleanly.
3. Never touches MCP / Prompt / Agent paths — they're already symmetric.
4. Dry-run mode (`--dry-run`) performs zero mutations.

Usage:

    python backend/scripts/migrate_blob_layout.py --dry-run
    python backend/scripts/migrate_blob_layout.py --tenant tenant-a

This script lives outside the production import graph (`backend/app/`
does not import from it).
"""

from __future__ import annotations

import sys
from dataclasses import dataclass
from typing import Protocol


# Paths whose second segment names a known non-skill hub must be left
# alone. Anything else under a tenant prefix is assumed to be a skill
# bundle in the legacy shape.
_NON_SKILL_HUB_NAMESPACES = {"mcps", "prompts", "agents"}

# Post-cutover skills live under this segment; if a source blob already
# has it, the migration is already done for that blob.
_SKILLS_TARGET_NAMESPACE = "skills"


class BlobBytesStore(Protocol):
    def list_names(self, prefix: str) -> list[str]: ...
    def exists(self, path: str) -> bool: ...
    def read_bytes(self, path: str) -> bytes: ...
    def write_bytes(self, path: str, data: bytes) -> None: ...
    def delete(self, path: str) -> None: ...


@dataclass(frozen=True)
class Migration:
    source_path: str
    target_path: str
    tenant_id: str
    skill_name: str
    sub_path: str


def execute_one(
    store: BlobBytesStore,
    migration: Migration,
    *,
    dry_run: bool,
) -> str:
    """Run the copy/verify/delete dance for one blob.

    Returns one of:
      - "DRY-RUN"          — dry-run short-circuit; no mutations
      - "MIGRATED"         — source copied, verified byte-for-byte, source deleted
      - "VERIFY_FAILED"    — target bytes don't match source; source NOT deleted
      - "NO_SOURCE"        — source absent (migration already done); target untouched

    Never raises on recoverable errors. Caller's driver loop should
    continue on VERIFY_FAILED and track a failure count for exit code.
    """
    if dry_run:
        return "DRY-RUN"

    if not store.exists(migration.source_path):
        return "NO_SOURCE"

    source_bytes = store.read_bytes(migration.source_path)

    # If target already exists (crash recovery), skip the copy but still
    # verify and delete source.
    if not store.exists(migration.target_path):
        store.write_bytes(migration.target_path, source_bytes)

    target_bytes = store.read_bytes(migration.target_path)
    if target_bytes != source_bytes:
        return "VERIFY_FAILED"

    store.delete(migration.source_path)
    return "MIGRATED"


def plan_migration(
    source_paths: list[str],
    tenant_filter: str | None = None,
) -> list[Migration]:
    """Pure: decide which blobs get moved and where. Does not touch storage.

    Skips: non-skill hub namespaces, blobs already at the target layout,
    and (if `tenant_filter` is given) anything outside that tenant.
    """
    out: list[Migration] = []
    for path in source_paths:
        parts = path.split("/", 2)
        if len(parts) < 3:
            # No tenant/skill/sub split possible — skip (root-level blob
            # or tenant-level blob with no artifact inside).
            continue
        tid, second, sub_path = parts[0], parts[1], parts[2]

        if tenant_filter is not None and tid != tenant_filter:
            continue
        if second == _SKILLS_TARGET_NAMESPACE:
            continue
        if second in _NON_SKILL_HUB_NAMESPACES:
            continue

        out.append(
            Migration(
                source_path=path,
                target_path=f"{tid}/{_SKILLS_TARGET_NAMESPACE}/{second}/{sub_path}",
                tenant_id=tid,
                skill_name=second,
                sub_path=sub_path,
            )
        )
    return out


def _log(status: str, m: Migration, **extra) -> None:
    """One-line structured event log. Human-readable, tee-able."""
    fields = [
        f"tenant={m.tenant_id}",
        f"skill={m.skill_name}",
        f"sub={m.sub_path}",
    ]
    for k, v in extra.items():
        fields.append(f"{k}={v}")
    print(f"{status:<14} {'  '.join(fields)}")


def run_migration(
    store: BlobBytesStore,
    tenant_filter: str | None,
    dry_run: bool,
) -> int:
    """Plan + execute. Returns process exit code (0 ok, 1 if any verify failed)."""
    plan = plan_migration(store.list_names(""), tenant_filter=tenant_filter)
    verify_failures = 0
    for migration in plan:
        status = execute_one(store, migration, dry_run=dry_run)
        _log(status, migration)
        if status == "VERIFY_FAILED":
            verify_failures += 1
    return 0 if verify_failures == 0 else 1


class _AzureBlobBytesStore:
    """Production adapter. Wraps azure-storage-blob's ContainerClient so it
    satisfies BlobBytesStore. Not used by the test suite."""

    def __init__(self, container_client):
        self._c = container_client

    def list_names(self, prefix: str) -> list[str]:
        return [b.name for b in self._c.list_blobs(name_starts_with=prefix)]

    def exists(self, path: str) -> bool:
        try:
            self._c.get_blob_client(path).get_blob_properties()
            return True
        except Exception:
            return False

    def read_bytes(self, path: str) -> bytes:
        return self._c.get_blob_client(path).download_blob().readall()

    def write_bytes(self, path: str, data: bytes) -> None:
        self._c.get_blob_client(path).upload_blob(data, overwrite=True)

    def delete(self, path: str) -> None:
        self._c.get_blob_client(path).delete_blob()


def _build_azure_store() -> _AzureBlobBytesStore:
    """Defer azure imports + config load until the script actually runs against
    production — tests don't need them, keeping test startup near-zero cost."""
    # Ensure backend/ is importable so `app.core.config` resolves when this
    # script is invoked from anywhere.
    import pathlib

    backend_dir = pathlib.Path(__file__).resolve().parent.parent
    if str(backend_dir) not in sys.path:
        sys.path.insert(0, str(backend_dir))

    from azure.identity import DefaultAzureCredential
    from azure.storage.blob import BlobServiceClient

    from app.core.config import settings

    credential = DefaultAzureCredential()
    service = BlobServiceClient(settings.blob_account_url, credential=credential)
    container = service.get_container_client(settings.blob_container_name)
    return _AzureBlobBytesStore(container)


def _parse_cli(argv: list[str]):
    import argparse

    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print the migration plan without touching storage.",
    )
    parser.add_argument(
        "--tenant",
        default=None,
        help="Limit migration to one tenant id (default: all tenants).",
    )
    # Advanced overrides — reserved for future customization, currently
    # unused by the planner. Accepted so operators writing runbooks in
    # advance don't break when we actually wire them up.
    parser.add_argument("--source-prefix-override", default=None, help="Reserved; unused today.")
    parser.add_argument("--target-prefix-override", default=None, help="Reserved; unused today.")
    return parser.parse_args(argv)


def main(argv: list[str]) -> int:
    args = _parse_cli(argv)
    store = _build_azure_store()
    return run_migration(
        store,
        tenant_filter=args.tenant,
        dry_run=args.dry_run,
    )


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
