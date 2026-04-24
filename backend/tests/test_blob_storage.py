import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from app.skills.service import BlobStorageService


@pytest.fixture
def mock_container_client():
    client = MagicMock()
    client.get_blob_client = MagicMock()
    return client


@pytest.fixture
def service(mock_container_client):
    svc = BlobStorageService.__new__(BlobStorageService)
    svc.container_client = mock_container_client
    return svc


class TestBlobPaths:
    def test_build_blob_path(self, service):
        path = service._blob_path("user-123", "my-skill", "SKILL.md")
        assert path == "user-123/my-skill/SKILL.md"

    def test_build_blob_path_nested(self, service):
        path = service._blob_path("user-123", "my-skill", "scripts/main.py")
        assert path == "user-123/my-skill/scripts/main.py"

    def test_build_skill_prefix(self, service):
        prefix = service._skill_prefix("user-123", "my-skill")
        assert prefix == "user-123/my-skill/"

    def test_build_tenant_prefix(self, service):
        prefix = service._tenant_prefix("tenant-123")
        assert prefix == "tenant-123/"


class TestJsonHelpers:
    """Generic JSON-blob helpers used by non-skill hubs (MCP today)."""

    def test_write_json_serializes_and_uploads(self, service, mock_container_client):
        blob_client = MagicMock()
        mock_container_client.get_blob_client.return_value = blob_client

        service.write_json("tenant-a/mcps/x/metadata.json", {"hello": "world"})

        mock_container_client.get_blob_client.assert_called_once_with(
            "tenant-a/mcps/x/metadata.json"
        )
        blob_client.upload_blob.assert_called_once()
        args, kwargs = blob_client.upload_blob.call_args
        import json as _json
        assert _json.loads(args[0].decode("utf-8")) == {"hello": "world"}
        assert kwargs == {"overwrite": True}

    def test_read_json_returns_parsed_dict(self, service, mock_container_client):
        blob_client = MagicMock()
        blob_client.download_blob.return_value.readall.return_value = b'{"a": 1}'
        mock_container_client.get_blob_client.return_value = blob_client

        result = service.read_json("tenant-a/mcps/x/metadata.json")
        assert result == {"a": 1}

    def test_read_json_returns_none_when_blob_missing(self, service, mock_container_client):
        blob_client = MagicMock()
        blob_client.download_blob.side_effect = Exception("blob not found")
        mock_container_client.get_blob_client.return_value = blob_client

        assert service.read_json("missing/path.json") is None

    def test_read_json_returns_none_on_invalid_json(self, service, mock_container_client):
        blob_client = MagicMock()
        blob_client.download_blob.return_value.readall.return_value = b"not json {{"
        mock_container_client.get_blob_client.return_value = blob_client

        assert service.read_json("corrupt/path.json") is None

    def test_list_names_returns_blob_names(self, service, mock_container_client):
        blob_a = MagicMock(); blob_a.name = "tenant-a/mcps/x/metadata.json"
        blob_b = MagicMock(); blob_b.name = "tenant-a/mcps/y/metadata.json"
        mock_container_client.list_blobs.return_value = [blob_a, blob_b]

        assert service.list_names("tenant-a/mcps/") == [
            "tenant-a/mcps/x/metadata.json",
            "tenant-a/mcps/y/metadata.json",
        ]

    def test_exists_true_when_properties_fetch_succeeds(self, service, mock_container_client):
        blob_client = MagicMock()
        blob_client.get_blob_properties.return_value = MagicMock()
        mock_container_client.get_blob_client.return_value = blob_client

        assert service.exists("tenant-a/mcps/x/metadata.json") is True

    def test_exists_false_when_properties_raise(self, service, mock_container_client):
        blob_client = MagicMock()
        blob_client.get_blob_properties.side_effect = Exception("not found")
        mock_container_client.get_blob_client.return_value = blob_client

        assert service.exists("tenant-a/mcps/missing.json") is False
