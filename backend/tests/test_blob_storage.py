import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from app.services.blob_storage import BlobStorageService


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

    def test_build_user_prefix(self, service):
        prefix = service._user_prefix("user-123")
        assert prefix == "user-123/"
