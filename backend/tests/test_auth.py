from app.auth.dependencies import get_current_user, UserInfo


def test_user_info_from_valid_payload(valid_token_payload):
    user = UserInfo(
        oid=valid_token_payload["oid"],
        name=valid_token_payload["name"],
        email=valid_token_payload["preferred_username"],
    )
    assert user.oid == "test-user-object-id-123"
    assert user.name == "Jiawei Chen"
    assert user.email == "jiawei@example.com"
