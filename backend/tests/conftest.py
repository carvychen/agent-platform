import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock

from app.core.main import app


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def valid_token_payload():
    return {
        "oid": "test-user-object-id-123",
        "preferred_username": "jiawei@example.com",
        "name": "Jiawei Chen",
        "tid": "test-tenant-id",
        "aud": "test-audience",
        "exp": 9999999999,
        "iss": "https://login.microsoftonline.com/test-tenant-id/v2.0",
    }


@pytest.fixture
def auth_headers():
    return {"Authorization": "Bearer fake-valid-token"}
