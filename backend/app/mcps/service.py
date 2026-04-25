from datetime import datetime, timezone
from typing import Protocol


class BlobJsonStore(Protocol):
    def write_json(self, path: str, data: dict) -> None: ...
    def read_json(self, path: str) -> dict | None: ...
    def list_names(self, prefix: str) -> list[str]: ...
    def exists(self, path: str) -> bool: ...
    def delete(self, path: str) -> None: ...


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _metadata_path(tenant_id: str, name: str) -> str:
    return f"{tenant_id}/mcps/{name}/metadata.json"


def _tenant_mcps_prefix(tenant_id: str) -> str:
    return f"{tenant_id}/mcps/"


class McpAlreadyExists(Exception):
    """Raised when create() is called for a slug already present in the tenant."""


class McpNotFound(Exception):
    """Raised when get/update/delete references a slug the tenant has not registered."""


class McpService:
    """Domain layer over a generic JSON blob store. Owns MCP-specific paths +
    the `source` / `created_at` / `updated_at` invariants. Infrastructure
    concerns (Azure Blob SDK, credentials) live in the store implementation.
    """

    def __init__(self, store: BlobJsonStore):
        self._store = store

    def list(self, tenant_id: str) -> list[dict]:
        prefix = _tenant_mcps_prefix(tenant_id)
        docs = []
        for path in sorted(self._store.list_names(prefix)):
            if not path.endswith("/metadata.json"):
                continue
            doc = self._store.read_json(path)
            if doc is not None:
                docs.append(doc)
        return docs

    def create(self, tenant_id: str, request_data: dict) -> dict:
        path = _metadata_path(tenant_id, request_data["name"])
        if self._store.exists(path):
            raise McpAlreadyExists(request_data["name"])
        now = _now_iso()
        doc = {
            **request_data,
            "source": "external",
            "created_at": now,
            "updated_at": now,
        }
        self._store.write_json(path, doc)
        return doc

    def get(self, tenant_id: str, name: str) -> dict:
        doc = self._store.read_json(_metadata_path(tenant_id, name))
        if doc is None:
            raise McpNotFound(name)
        return doc

    def update(self, tenant_id: str, name: str, patch: dict) -> dict:
        path = _metadata_path(tenant_id, name)
        existing = self._store.read_json(path)
        if existing is None:
            raise McpNotFound(name)
        updated = {
            **existing,
            **patch,
            "name": existing["name"],
            "source": existing["source"],
            "created_at": existing["created_at"],
            "updated_at": _now_iso(),
        }
        self._store.write_json(path, updated)
        return updated

    def delete(self, tenant_id: str, name: str) -> None:
        path = _metadata_path(tenant_id, name)
        if not self._store.exists(path):
            raise McpNotFound(name)
        self._store.delete(path)
