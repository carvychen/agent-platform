import secrets
import time
from dataclasses import dataclass


@dataclass
class TokenEntry:
    tenant_id: str
    skill_name: str
    created_at: float
    ttl: int


class InstallTokenStore:
    def __init__(self):
        self._tokens: dict[str, TokenEntry] = {}

    def create_token(self, tenant_id: str, skill_name: str, ttl: int = 300) -> str:
        self._cleanup()
        token = secrets.token_urlsafe(32)
        self._tokens[token] = TokenEntry(
            tenant_id=tenant_id,
            skill_name=skill_name,
            created_at=time.time(),
            ttl=ttl,
        )
        return token

    def validate_token(self, token: str) -> TokenEntry | None:
        entry = self._tokens.get(token)
        if entry is None:
            return None
        if time.time() - entry.created_at > entry.ttl:
            del self._tokens[token]
            return None
        # Single-use: delete after successful validation
        del self._tokens[token]
        return entry

    def _cleanup(self):
        now = time.time()
        expired = [k for k, v in self._tokens.items() if now - v.created_at > v.ttl]
        for k in expired:
            del self._tokens[k]


install_token_store = InstallTokenStore()
