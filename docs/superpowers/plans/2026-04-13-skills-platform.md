# Skills Platform MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an Agent Platform MVP that lets users create, edit, and manage AI agent skills following the agentskills.io open standard, stored in Azure Blob Storage with Azure AD authentication.

**Architecture:** React SPA frontend with Monaco Editor for code editing, FastAPI backend deployed on Azure App Service, Azure Blob Storage for skill file persistence, Azure AD / Entra ID for authentication. The frontend talks to the backend API which mediates all Blob Storage access.

**Tech Stack:** React 18 + TypeScript + Vite, Tailwind CSS + Radix UI, Monaco Editor, React Router v7, TanStack React Query + Axios, React Hook Form + Zod, Python FastAPI, azure-storage-blob SDK, MSAL.js / msal-browser, Vitest

**Design Reference:** See `docs/figma-*.jpg` for visual mockups of each page.

**Spec Reference:** See `docs/superpowers/specs/2026-04-13-skills-platform-design.md`

---

## File Structure

### Backend (`backend/`)

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                    # FastAPI app, CORS, router mounting
│   ├── config.py                  # Settings from env vars (blob, Azure AD)
│   ├── auth/
│   │   ├── __init__.py
│   │   └── dependencies.py        # Azure AD JWT verification dependency
│   ├── routers/
│   │   ├── __init__.py
│   │   └── skills.py              # /api/skills endpoints
│   ├── services/
│   │   ├── __init__.py
│   │   ├── blob_storage.py        # Azure Blob Storage CRUD operations
│   │   └── skill_validator.py     # agentskills.io frontmatter validation
│   └── models/
│       ├── __init__.py
│       └── skill.py               # Pydantic models for request/response
├── tests/
│   ├── __init__.py
│   ├── conftest.py                # Shared fixtures (mock blob, fake token)
│   ├── test_skill_validator.py    # Validation logic tests
│   ├── test_skills_router.py      # API endpoint tests
│   └── test_blob_storage.py       # Blob service tests
├── requirements.txt
├── requirements-dev.txt
└── Dockerfile
```

### Frontend (`frontend/`)

```
frontend/
├── src/
│   ├── main.tsx                           # App entry point
│   ├── App.tsx                            # Router + auth provider setup
│   ├── auth/
│   │   ├── msalConfig.ts                  # MSAL configuration
│   │   ├── AuthProvider.tsx               # MSAL React provider wrapper
│   │   └── useAuth.ts                     # Auth hook (login, logout, token)
│   ├── api/
│   │   ├── axiosClient.ts                 # Axios instance with auth interceptor
│   │   └── skillsApi.ts                   # Skills API functions
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx                # Global icon sidebar navigation
│   │   │   ├── TopBar.tsx                 # Top bar with breadcrumbs
│   │   │   └── AppLayout.tsx              # Layout shell (sidebar + topbar + outlet)
│   │   ├── skills/
│   │   │   ├── SkillCard.tsx              # Single skill card for list page
│   │   │   ├── TemplateCard.tsx           # Template option card for create wizard
│   │   │   ├── FileTree.tsx              # File explorer tree component
│   │   │   ├── SkillMetadataPills.tsx     # Version/author/license pill badges
│   │   │   └── MarkdownRenderer.tsx       # Markdown to HTML renderer
│   │   └── ui/
│   │       ├── SearchInput.tsx            # Search input with icon
│   │       ├── Breadcrumb.tsx             # Breadcrumb navigation
│   │       └── EmptyState.tsx             # Empty state placeholder
│   ├── pages/
│   │   └── skills/
│   │       ├── SkillListPage.tsx          # /skills
│   │       ├── SkillCreatePage.tsx        # /skills/new
│   │       ├── SkillEditorPage.tsx        # /skills/:name/edit
│   │       └── SkillDetailPage.tsx        # /skills/:name
│   ├── hooks/
│   │   ├── useSkills.ts                   # React Query hooks for skills API
│   │   └── useSkillFiles.ts              # React Query hooks for file operations
│   └── types/
│       └── skill.ts                       # TypeScript type definitions
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── tailwind.config.ts                     # Tailwind with custom theme (colors, fonts)
```

---

## Phase 1: Project Scaffolding

### Task 1: Initialize Backend Project

**Files:**
- Create: `backend/requirements.txt`
- Create: `backend/requirements-dev.txt`
- Create: `backend/app/__init__.py`
- Create: `backend/app/main.py`
- Create: `backend/app/config.py`

- [ ] **Step 1: Create backend directory and requirements files**

```bash
mkdir -p backend/app backend/tests
```

Create `backend/requirements.txt`:
```
fastapi==0.115.0
uvicorn[standard]==0.30.0
azure-storage-blob==12.23.0
azure-identity==1.18.0
python-jose[cryptography]==3.3.0
httpx==0.27.0
python-multipart==0.0.12
pyyaml==6.0.2
python-dotenv==1.0.1
```

Create `backend/requirements-dev.txt`:
```
-r requirements.txt
pytest==8.3.0
pytest-asyncio==0.24.0
pytest-cov==5.0.0
```

- [ ] **Step 2: Create config module**

Create `backend/app/config.py`:
```python
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Azure Blob Storage
    blob_connection_string: str = ""
    blob_container_name: str = "skills-container"

    # Azure AD
    azure_ad_tenant_id: str = ""
    azure_ad_client_id: str = ""
    azure_ad_audience: str = ""

    # CORS
    cors_origins: list[str] = ["http://localhost:5173"]

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
```

- [ ] **Step 3: Create FastAPI main app**

Create `backend/app/__init__.py` (empty file).

Create `backend/app/main.py`:
```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings

app = FastAPI(title="Agent Platform API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
async def health():
    return {"status": "ok"}
```

- [ ] **Step 4: Verify backend starts**

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Open `http://localhost:8000/api/health` — expect `{"status":"ok"}`.

- [ ] **Step 5: Commit**

```bash
git init
git add backend/
git commit -m "feat: initialize backend with FastAPI skeleton"
```

---

### Task 2: Initialize Frontend Project

**Files:**
- Create: `frontend/` (via Vite scaffold)
- Modify: `frontend/package.json` (add dependencies)
- Create: `frontend/tailwind.config.ts`

- [ ] **Step 1: Scaffold React + TypeScript + Vite project**

```bash
npm create vite@latest frontend -- --template react-ts
cd frontend
```

- [ ] **Step 2: Install all dependencies**

```bash
npm install react-router-dom @tanstack/react-query axios react-hook-form @hookform/resolvers zod @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-tabs @radix-ui/react-tooltip @radix-ui/react-separator @radix-ui/react-scroll-area @monaco-editor/react react-markdown rehype-raw remark-gfm react-syntax-highlighter @azure/msal-browser @azure/msal-react lucide-react class-variance-authority clsx tailwind-merge
```

```bash
npm install -D tailwindcss @tailwindcss/vite @types/react-syntax-highlighter
```

- [ ] **Step 3: Configure Tailwind with custom theme**

Replace `frontend/src/index.css`:
```css
@import "tailwindcss";

@theme {
  --color-primary: #3B82F6;
  --color-primary-hover: #2563EB;
  --color-success: #10B981;
  --color-warning: #F59E0B;
  --color-danger: #EF4444;
  --color-sidebar: #0F0F1A;
  --color-sidebar-hover: #1E293B;
  --color-editor-bg: #1E1E2E;
  --color-editor-panel: #16162A;
  --color-editor-topbar: #1B1B2F;
  --color-text-primary: #0F0F1A;
  --color-text-secondary: #6B7280;
  --color-text-muted: #9CA3AF;
  --color-border: #E5E7EB;
  --color-surface: #FAFAFA;
  --color-card: #FFFFFF;

  --font-mono: "JetBrains Mono", ui-monospace, monospace;
  --font-sans: "DM Sans", ui-sans-serif, system-ui, sans-serif;
}
```

Update `frontend/vite.config.ts`:
```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      "/api": "http://localhost:8000",
    },
  },
});
```

- [ ] **Step 4: Add Google Fonts to index.html**

Update `frontend/index.html` — add inside `<head>`:
```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link
  href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap"
  rel="stylesheet"
/>
```

- [ ] **Step 5: Verify frontend starts**

```bash
cd frontend
npm run dev
```

Open `http://localhost:5173` — expect Vite default page with custom fonts loading.

- [ ] **Step 6: Commit**

```bash
git add frontend/
git commit -m "feat: initialize frontend with React + Vite + Tailwind"
```

---

## Phase 2: Authentication

### Task 3: Backend Auth Middleware

**Files:**
- Create: `backend/app/auth/__init__.py`
- Create: `backend/app/auth/dependencies.py`
- Create: `backend/tests/__init__.py`
- Create: `backend/tests/conftest.py`
- Create: `backend/tests/test_auth.py`

- [ ] **Step 1: Write test for auth dependency**

Create `backend/tests/__init__.py` (empty file).

Create `backend/tests/conftest.py`:
```python
import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock

from app.main import app


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
```

Create `backend/tests/test_auth.py`:
```python
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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd backend
python -m pytest tests/test_auth.py -v
```

Expected: FAIL — `ModuleNotFoundError: No module named 'app.auth.dependencies'`

- [ ] **Step 3: Implement auth dependency**

Create `backend/app/auth/__init__.py` (empty file).

Create `backend/app/auth/dependencies.py`:
```python
from dataclasses import dataclass

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
import httpx

from app.config import settings

security = HTTPBearer()

_jwks_cache: dict | None = None


@dataclass
class UserInfo:
    oid: str
    name: str
    email: str


async def _get_jwks() -> dict:
    global _jwks_cache
    if _jwks_cache is not None:
        return _jwks_cache

    jwks_url = (
        f"https://login.microsoftonline.com/{settings.azure_ad_tenant_id}"
        f"/discovery/v2.0/keys"
    )
    async with httpx.AsyncClient() as client:
        resp = await client.get(jwks_url)
        resp.raise_for_status()
        _jwks_cache = resp.json()
        return _jwks_cache


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> UserInfo:
    token = credentials.credentials

    try:
        jwks = await _get_jwks()
        unverified_header = jwt.get_unverified_header(token)
        rsa_key = {}
        for key in jwks.get("keys", []):
            if key["kid"] == unverified_header.get("kid"):
                rsa_key = key
                break

        if not rsa_key:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Unable to find appropriate key",
            )

        payload = jwt.decode(
            token,
            rsa_key,
            algorithms=["RS256"],
            audience=settings.azure_ad_audience,
            issuer=f"https://login.microsoftonline.com/{settings.azure_ad_tenant_id}/v2.0",
        )

        return UserInfo(
            oid=payload["oid"],
            name=payload.get("name", ""),
            email=payload.get("preferred_username", ""),
        )

    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Token validation failed: {e}",
        )
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd backend
python -m pytest tests/test_auth.py -v
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/app/auth/ backend/tests/
git commit -m "feat: add Azure AD JWT auth middleware"
```

---

### Task 4: Frontend MSAL Auth Setup

**Files:**
- Create: `frontend/src/auth/msalConfig.ts`
- Create: `frontend/src/auth/AuthProvider.tsx`
- Create: `frontend/src/auth/useAuth.ts`
- Create: `frontend/src/types/skill.ts`

- [ ] **Step 1: Create MSAL configuration**

Create `frontend/src/auth/msalConfig.ts`:
```typescript
import { Configuration, LogLevel } from "@azure/msal-browser";

export const msalConfig: Configuration = {
  auth: {
    clientId: import.meta.env.VITE_AZURE_AD_CLIENT_ID || "",
    authority: `https://login.microsoftonline.com/${import.meta.env.VITE_AZURE_AD_TENANT_ID || "common"}`,
    redirectUri: window.location.origin,
  },
  cache: {
    cacheLocation: "sessionStorage",
    storeAuthStateInCookie: false,
  },
  system: {
    loggerOptions: {
      loggerCallback: (_level, message) => {
        if (import.meta.env.DEV) console.debug(message);
      },
      logLevel: LogLevel.Warning,
    },
  },
};

export const loginScopes = [
  `api://${import.meta.env.VITE_AZURE_AD_CLIENT_ID}/Skills.ReadWrite`,
];
```

- [ ] **Step 2: Create AuthProvider wrapper**

Create `frontend/src/auth/AuthProvider.tsx`:
```tsx
import { ReactNode } from "react";
import { MsalProvider } from "@azure/msal-react";
import { PublicClientApplication } from "@azure/msal-browser";
import { msalConfig } from "./msalConfig";

const msalInstance = new PublicClientApplication(msalConfig);

export function AuthProvider({ children }: { children: ReactNode }) {
  return <MsalProvider instance={msalInstance}>{children}</MsalProvider>;
}
```

- [ ] **Step 3: Create useAuth hook**

Create `frontend/src/auth/useAuth.ts`:
```typescript
import { useMsal, useIsAuthenticated } from "@azure/msal-react";
import { useCallback } from "react";
import { loginScopes } from "./msalConfig";

export function useAuth() {
  const { instance, accounts } = useMsal();
  const isAuthenticated = useIsAuthenticated();

  const login = useCallback(async () => {
    await instance.loginRedirect({ scopes: loginScopes });
  }, [instance]);

  const logout = useCallback(async () => {
    await instance.logoutRedirect();
  }, [instance]);

  const getAccessToken = useCallback(async (): Promise<string> => {
    const account = accounts[0];
    if (!account) throw new Error("No active account");

    const response = await instance.acquireTokenSilent({
      scopes: loginScopes,
      account,
    });
    return response.accessToken;
  }, [instance, accounts]);

  return {
    isAuthenticated,
    user: accounts[0] || null,
    login,
    logout,
    getAccessToken,
  };
}
```

- [ ] **Step 4: Create TypeScript types**

Create `frontend/src/types/skill.ts`:
```typescript
export interface SkillMetadata {
  author?: string;
  version?: string;
  [key: string]: string | undefined;
}

export interface Skill {
  name: string;
  description: string;
  license?: string;
  compatibility?: string;
  metadata?: SkillMetadata;
  file_count: number;
  total_size: number;
  created_at: string;
  modified_at: string;
}

export interface SkillListResponse {
  skills: Skill[];
  total: number;
  page: number;
  page_size: number;
}

export interface SkillCreateRequest {
  name: string;
  description: string;
  template: "blank" | "script" | "instruction" | "mcp";
  license?: string;
  metadata?: SkillMetadata;
}

export interface SkillFile {
  path: string;
  is_directory: boolean;
  size: number;
}

export interface SkillDetail extends Skill {
  files: SkillFile[];
}

export interface ValidationResult {
  valid: boolean;
  errors: { field: string; message: string }[];
  warnings: { field: string; message: string }[];
}
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/auth/ frontend/src/types/
git commit -m "feat: add MSAL auth setup and TypeScript types"
```

---

## Phase 3: Backend API

### Task 5: Skill Validator Service

**Files:**
- Create: `backend/app/services/__init__.py`
- Create: `backend/app/services/skill_validator.py`
- Create: `backend/tests/test_skill_validator.py`

- [ ] **Step 1: Write failing tests for skill name validation**

Create `backend/tests/test_skill_validator.py`:
```python
import pytest
from app.services.skill_validator import validate_skill_name, validate_frontmatter


class TestValidateSkillName:
    def test_valid_simple_name(self):
        errors = validate_skill_name("crm-opportunity")
        assert errors == []

    def test_valid_single_word(self):
        errors = validate_skill_name("helper")
        assert errors == []

    def test_valid_with_numbers(self):
        errors = validate_skill_name("api-v2-client")
        assert errors == []

    def test_empty_name(self):
        errors = validate_skill_name("")
        assert len(errors) > 0

    def test_too_long(self):
        errors = validate_skill_name("a" * 65)
        assert len(errors) > 0

    def test_uppercase_rejected(self):
        errors = validate_skill_name("CRM-Opportunity")
        assert len(errors) > 0

    def test_starts_with_hyphen(self):
        errors = validate_skill_name("-bad-name")
        assert len(errors) > 0

    def test_ends_with_hyphen(self):
        errors = validate_skill_name("bad-name-")
        assert len(errors) > 0

    def test_consecutive_hyphens(self):
        errors = validate_skill_name("bad--name")
        assert len(errors) > 0

    def test_spaces_rejected(self):
        errors = validate_skill_name("bad name")
        assert len(errors) > 0


class TestValidateFrontmatter:
    def test_valid_minimal(self):
        result = validate_frontmatter({"name": "my-skill", "description": "Does things"})
        assert result.valid is True
        assert result.errors == []

    def test_missing_name(self):
        result = validate_frontmatter({"description": "Does things"})
        assert result.valid is False
        assert any(e["field"] == "name" for e in result.errors)

    def test_missing_description(self):
        result = validate_frontmatter({"name": "my-skill"})
        assert result.valid is False
        assert any(e["field"] == "description" for e in result.errors)

    def test_description_too_long(self):
        result = validate_frontmatter({
            "name": "my-skill",
            "description": "x" * 1025,
        })
        assert result.valid is False

    def test_compatibility_too_long(self):
        result = validate_frontmatter({
            "name": "my-skill",
            "description": "ok",
            "compatibility": "x" * 501,
        })
        assert result.valid is False

    def test_warning_for_missing_compatibility(self):
        result = validate_frontmatter({"name": "my-skill", "description": "ok"})
        assert result.valid is True
        assert any(w["field"] == "compatibility" for w in result.warnings)
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd backend
python -m pytest tests/test_skill_validator.py -v
```

Expected: FAIL — `ModuleNotFoundError`

- [ ] **Step 3: Implement validator**

Create `backend/app/services/__init__.py` (empty file).

Create `backend/app/services/skill_validator.py`:
```python
import re
from dataclasses import dataclass, field


@dataclass
class ValidationResult:
    valid: bool = True
    errors: list[dict[str, str]] = field(default_factory=list)
    warnings: list[dict[str, str]] = field(default_factory=list)

    def add_error(self, field_name: str, message: str):
        self.valid = False
        self.errors.append({"field": field_name, "message": message})

    def add_warning(self, field_name: str, message: str):
        self.warnings.append({"field": field_name, "message": message})


NAME_PATTERN = re.compile(r"^[a-z0-9]([a-z0-9-]*[a-z0-9])?$")
CONSECUTIVE_HYPHENS = re.compile(r"--")


def validate_skill_name(name: str) -> list[str]:
    errors = []
    if not name:
        errors.append("Name is required")
        return errors
    if len(name) > 64:
        errors.append("Name must be 64 characters or fewer")
    if not NAME_PATTERN.match(name):
        errors.append(
            "Name must contain only lowercase letters, numbers, and hyphens. "
            "Must not start or end with a hyphen."
        )
    if CONSECUTIVE_HYPHENS.search(name):
        errors.append("Name must not contain consecutive hyphens")
    return errors


def validate_frontmatter(frontmatter: dict) -> ValidationResult:
    result = ValidationResult()

    # name: required
    name = frontmatter.get("name", "")
    if not name:
        result.add_error("name", "name is required")
    else:
        name_errors = validate_skill_name(name)
        for err in name_errors:
            result.add_error("name", err)

    # description: required, max 1024
    description = frontmatter.get("description", "")
    if not description:
        result.add_error("description", "description is required")
    elif len(description) > 1024:
        result.add_error("description", "description must be 1024 characters or fewer")

    # compatibility: optional, max 500
    compatibility = frontmatter.get("compatibility", "")
    if compatibility and len(compatibility) > 500:
        result.add_error("compatibility", "compatibility must be 500 characters or fewer")

    # warnings
    if not frontmatter.get("compatibility"):
        result.add_warning("compatibility", "Consider adding compatibility info")

    return result
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd backend
python -m pytest tests/test_skill_validator.py -v
```

Expected: All PASS

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/ backend/tests/test_skill_validator.py
git commit -m "feat: add agentskills.io frontmatter validator"
```

---

### Task 6: Blob Storage Service

**Files:**
- Create: `backend/app/services/blob_storage.py`
- Create: `backend/tests/test_blob_storage.py`

- [ ] **Step 1: Write failing tests for blob storage service**

Create `backend/tests/test_blob_storage.py`:
```python
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
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd backend
python -m pytest tests/test_blob_storage.py -v
```

Expected: FAIL — `ModuleNotFoundError`

- [ ] **Step 3: Implement blob storage service**

Create `backend/app/services/blob_storage.py`:
```python
import yaml
from azure.storage.blob import BlobServiceClient, ContainerClient

from app.config import settings


class BlobStorageService:
    def __init__(self):
        blob_service = BlobServiceClient.from_connection_string(
            settings.blob_connection_string
        )
        self.container_client: ContainerClient = blob_service.get_container_client(
            settings.blob_container_name
        )

    def _user_prefix(self, user_id: str) -> str:
        return f"{user_id}/"

    def _skill_prefix(self, user_id: str, skill_name: str) -> str:
        return f"{user_id}/{skill_name}/"

    def _blob_path(self, user_id: str, skill_name: str, file_path: str) -> str:
        return f"{user_id}/{skill_name}/{file_path}"

    def list_skills(self, user_id: str) -> list[dict]:
        prefix = self._user_prefix(user_id)
        skill_names = set()
        for blob in self.container_client.list_blobs(name_starts_with=prefix):
            # Extract skill name: user-id/skill-name/...
            parts = blob.name[len(prefix) :].split("/")
            if parts:
                skill_names.add(parts[0])

        skills = []
        for name in sorted(skill_names):
            skill_md_path = self._blob_path(user_id, name, "SKILL.md")
            try:
                blob_client = self.container_client.get_blob_client(skill_md_path)
                content = blob_client.download_blob().readall().decode("utf-8")
                frontmatter = self._parse_frontmatter(content)
                file_count, total_size = self._count_files(user_id, name)
                props = blob_client.get_blob_properties()
                skills.append({
                    "name": name,
                    "description": frontmatter.get("description", ""),
                    "license": frontmatter.get("license", ""),
                    "compatibility": frontmatter.get("compatibility", ""),
                    "metadata": frontmatter.get("metadata", {}),
                    "file_count": file_count,
                    "total_size": total_size,
                    "created_at": props.creation_time.isoformat() if props.creation_time else "",
                    "modified_at": props.last_modified.isoformat() if props.last_modified else "",
                })
            except Exception:
                continue

        return skills

    def get_skill(self, user_id: str, skill_name: str) -> dict | None:
        skill_md_path = self._blob_path(user_id, skill_name, "SKILL.md")
        try:
            blob_client = self.container_client.get_blob_client(skill_md_path)
            content = blob_client.download_blob().readall().decode("utf-8")
            frontmatter = self._parse_frontmatter(content)
            files = self._list_files(user_id, skill_name)
            file_count, total_size = self._count_files(user_id, skill_name)
            props = blob_client.get_blob_properties()
            return {
                "name": skill_name,
                "description": frontmatter.get("description", ""),
                "license": frontmatter.get("license", ""),
                "compatibility": frontmatter.get("compatibility", ""),
                "metadata": frontmatter.get("metadata", {}),
                "files": files,
                "file_count": file_count,
                "total_size": total_size,
                "created_at": props.creation_time.isoformat() if props.creation_time else "",
                "modified_at": props.last_modified.isoformat() if props.last_modified else "",
            }
        except Exception:
            return None

    def create_skill(self, user_id: str, skill_name: str, files: dict[str, str]):
        for file_path, content in files.items():
            blob_path = self._blob_path(user_id, skill_name, file_path)
            blob_client = self.container_client.get_blob_client(blob_path)
            blob_client.upload_blob(content.encode("utf-8"), overwrite=True)

    def delete_skill(self, user_id: str, skill_name: str):
        prefix = self._skill_prefix(user_id, skill_name)
        for blob in self.container_client.list_blobs(name_starts_with=prefix):
            self.container_client.get_blob_client(blob.name).delete_blob()

    def read_file(self, user_id: str, skill_name: str, file_path: str) -> str | None:
        blob_path = self._blob_path(user_id, skill_name, file_path)
        try:
            blob_client = self.container_client.get_blob_client(blob_path)
            return blob_client.download_blob().readall().decode("utf-8")
        except Exception:
            return None

    def write_file(self, user_id: str, skill_name: str, file_path: str, content: str):
        blob_path = self._blob_path(user_id, skill_name, file_path)
        blob_client = self.container_client.get_blob_client(blob_path)
        blob_client.upload_blob(content.encode("utf-8"), overwrite=True)

    def delete_file(self, user_id: str, skill_name: str, file_path: str):
        blob_path = self._blob_path(user_id, skill_name, file_path)
        blob_client = self.container_client.get_blob_client(blob_path)
        blob_client.delete_blob()

    def _list_files(self, user_id: str, skill_name: str) -> list[dict]:
        prefix = self._skill_prefix(user_id, skill_name)
        files = []
        dirs_seen = set()
        for blob in self.container_client.list_blobs(name_starts_with=prefix):
            relative_path = blob.name[len(prefix) :]
            files.append({
                "path": relative_path,
                "is_directory": False,
                "size": blob.size,
            })
            # Track directories
            parts = relative_path.split("/")
            if len(parts) > 1:
                dir_path = parts[0] + "/"
                if dir_path not in dirs_seen:
                    dirs_seen.add(dir_path)
        return files

    def _count_files(self, user_id: str, skill_name: str) -> tuple[int, int]:
        prefix = self._skill_prefix(user_id, skill_name)
        count = 0
        total_size = 0
        for blob in self.container_client.list_blobs(name_starts_with=prefix):
            count += 1
            total_size += blob.size
        return count, total_size

    @staticmethod
    def _parse_frontmatter(content: str) -> dict:
        if not content.startswith("---"):
            return {}
        parts = content.split("---", 2)
        if len(parts) < 3:
            return {}
        try:
            return yaml.safe_load(parts[1]) or {}
        except yaml.YAMLError:
            return {}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd backend
python -m pytest tests/test_blob_storage.py -v
```

Expected: All PASS

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/blob_storage.py backend/tests/test_blob_storage.py
git commit -m "feat: add Azure Blob Storage service for skill CRUD"
```

---

### Task 7: Skills API Router

**Files:**
- Create: `backend/app/models/__init__.py`
- Create: `backend/app/models/skill.py`
- Create: `backend/app/routers/__init__.py`
- Create: `backend/app/routers/skills.py`
- Modify: `backend/app/main.py` (mount router)
- Create: `backend/tests/test_skills_router.py`

- [ ] **Step 1: Create Pydantic models**

Create `backend/app/models/__init__.py` (empty file).

Create `backend/app/models/skill.py`:
```python
from pydantic import BaseModel, Field


class SkillCreateRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=64)
    description: str = Field(..., min_length=1, max_length=1024)
    template: str = Field(default="blank", pattern="^(blank|script|instruction|mcp)$")
    license: str | None = None
    metadata: dict[str, str] | None = None


class FileWriteRequest(BaseModel):
    content: str
```

- [ ] **Step 2: Create skills router**

Create `backend/app/routers/__init__.py` (empty file).

Create `backend/app/routers/skills.py`:
```python
from fastapi import APIRouter, Depends, HTTPException, status

from app.auth.dependencies import get_current_user, UserInfo
from app.models.skill import SkillCreateRequest, FileWriteRequest
from app.services.blob_storage import BlobStorageService
from app.services.skill_validator import validate_skill_name, validate_frontmatter

router = APIRouter(prefix="/api/skills", tags=["skills"])

_blob_service: BlobStorageService | None = None


def get_blob_service() -> BlobStorageService:
    global _blob_service
    if _blob_service is None:
        _blob_service = BlobStorageService()
    return _blob_service


TEMPLATES = {
    "blank": {
        "SKILL.md": "---\nname: {name}\ndescription: {description}\n{license}{metadata}---\n\n# {title}\n\nAdd your skill instructions here.\n",
        "scripts/.gitkeep": "",
        "references/.gitkeep": "",
        "assets/.gitkeep": "",
    },
    "script": {
        "SKILL.md": '---\nname: {name}\ndescription: {description}\n{license}{metadata}---\n\n# {title}\n\n## Available Scripts\n\n| Script | Description | Required Args |\n|--------|-------------|---------------|\n| `scripts/main.py` | Main script | `--input` |\n\n## Usage\n\n```bash\npython scripts/main.py --input "value"\n```\n',
        "scripts/main.py": '"""Main script for {name} skill."""\nimport argparse\n\n\ndef main():\n    parser = argparse.ArgumentParser(description="{description}")\n    parser.add_argument("--input", required=True, help="Input value")\n    args = parser.parse_args()\n    print(f"Processing: {{args.input}}")\n\n\nif __name__ == "__main__":\n    main()\n',
        "references/REFERENCE.md": "# Reference\n\nAdd detailed technical reference here.\n",
        "assets/.gitkeep": "",
    },
    "instruction": {
        "SKILL.md": "---\nname: {name}\ndescription: {description}\n{license}{metadata}---\n\n# {title}\n\n## When to Use\n\nDescribe when this skill should be activated.\n\n## Instructions\n\n1. Step one\n2. Step two\n3. Step three\n\n## Examples\n\n**Example 1:**\nInput: ...\nOutput: ...\n\n## Edge Cases\n\n- Handle case A by...\n- Handle case B by...\n",
        "references/.gitkeep": "",
        "assets/.gitkeep": "",
    },
    "mcp": {
        "SKILL.md": '---\nname: {name}\ndescription: {description}\n{license}{metadata}compatibility: Requires Python 3.10+, httpx\n---\n\n# {title}\n\n## Scripts\n\n| Script | Description |\n|--------|-------------|\n| `scripts/client.py` | API client |\n\n## Setup\n\n1. Set environment variables in `.env`\n2. Run: `python scripts/client.py --action list`\n',
        "scripts/client.py": '"""MCP/API client for {name} skill."""\nimport argparse\nimport httpx\nimport os\n\n\nAPI_BASE_URL = os.getenv("API_BASE_URL", "https://api.example.com")\nAPI_KEY = os.getenv("API_KEY", "")\n\n\ndef make_request(action: str) -> dict:\n    headers = {{"Authorization": f"Bearer {{API_KEY}}"}}\n    with httpx.Client(base_url=API_BASE_URL, headers=headers) as client:\n        resp = client.get(f"/{{action}}")\n        resp.raise_for_status()\n        return resp.json()\n\n\ndef main():\n    parser = argparse.ArgumentParser(description="{description}")\n    parser.add_argument("--action", required=True, help="API action")\n    args = parser.parse_args()\n    result = make_request(args.action)\n    print(result)\n\n\nif __name__ == "__main__":\n    main()\n',
        "references/API.md": "# API Reference\n\n## Base URL\n\n`https://api.example.com`\n\n## Authentication\n\nBearer token via `API_KEY` environment variable.\n\n## Endpoints\n\n### GET /list\n\nReturns all items.\n",
        "assets/.gitkeep": "",
    },
}


def _render_template(template_files: dict, req: SkillCreateRequest) -> dict[str, str]:
    title = req.name.replace("-", " ").title()
    license_line = f"license: {req.license}\n" if req.license else ""
    metadata_lines = ""
    if req.metadata:
        metadata_lines = "metadata:\n"
        for k, v in req.metadata.items():
            metadata_lines += f'  {k}: "{v}"\n'

    rendered = {}
    for path, content in template_files.items():
        rendered[path] = content.format(
            name=req.name,
            description=req.description,
            title=title,
            license=license_line,
            metadata=metadata_lines,
        )
    return rendered


@router.get("")
def list_skills(
    user: UserInfo = Depends(get_current_user),
    blob: BlobStorageService = Depends(get_blob_service),
):
    skills = blob.list_skills(user.oid)
    return {"skills": skills, "total": len(skills), "page": 1, "page_size": len(skills)}


@router.post("", status_code=status.HTTP_201_CREATED)
def create_skill(
    req: SkillCreateRequest,
    user: UserInfo = Depends(get_current_user),
    blob: BlobStorageService = Depends(get_blob_service),
):
    name_errors = validate_skill_name(req.name)
    if name_errors:
        raise HTTPException(status_code=422, detail=name_errors)

    existing = blob.get_skill(user.oid, req.name)
    if existing:
        raise HTTPException(status_code=409, detail=f"Skill '{req.name}' already exists")

    template_files = TEMPLATES.get(req.template, TEMPLATES["blank"])
    rendered = _render_template(template_files, req)
    blob.create_skill(user.oid, req.name, rendered)

    return blob.get_skill(user.oid, req.name)


@router.get("/{name}")
def get_skill(
    name: str,
    user: UserInfo = Depends(get_current_user),
    blob: BlobStorageService = Depends(get_blob_service),
):
    skill = blob.get_skill(user.oid, name)
    if not skill:
        raise HTTPException(status_code=404, detail=f"Skill '{name}' not found")
    return skill


@router.delete("/{name}", status_code=status.HTTP_204_NO_CONTENT)
def delete_skill(
    name: str,
    user: UserInfo = Depends(get_current_user),
    blob: BlobStorageService = Depends(get_blob_service),
):
    skill = blob.get_skill(user.oid, name)
    if not skill:
        raise HTTPException(status_code=404, detail=f"Skill '{name}' not found")
    blob.delete_skill(user.oid, name)


@router.get("/{name}/files/{file_path:path}")
def read_file(
    name: str,
    file_path: str,
    user: UserInfo = Depends(get_current_user),
    blob: BlobStorageService = Depends(get_blob_service),
):
    content = blob.read_file(user.oid, name, file_path)
    if content is None:
        raise HTTPException(status_code=404, detail=f"File '{file_path}' not found")
    return {"path": file_path, "content": content}


@router.put("/{name}/files/{file_path:path}")
def write_file(
    name: str,
    file_path: str,
    req: FileWriteRequest,
    user: UserInfo = Depends(get_current_user),
    blob: BlobStorageService = Depends(get_blob_service),
):
    skill = blob.get_skill(user.oid, name)
    if not skill:
        raise HTTPException(status_code=404, detail=f"Skill '{name}' not found")
    blob.write_file(user.oid, name, file_path, req.content)
    return {"path": file_path, "size": len(req.content.encode("utf-8"))}


@router.delete("/{name}/files/{file_path:path}", status_code=status.HTTP_204_NO_CONTENT)
def delete_file(
    name: str,
    file_path: str,
    user: UserInfo = Depends(get_current_user),
    blob: BlobStorageService = Depends(get_blob_service),
):
    blob.delete_file(user.oid, name, file_path)


@router.post("/{name}/validate")
def validate_skill(
    name: str,
    user: UserInfo = Depends(get_current_user),
    blob: BlobStorageService = Depends(get_blob_service),
):
    content = blob.read_file(user.oid, name, "SKILL.md")
    if content is None:
        raise HTTPException(status_code=404, detail="SKILL.md not found")

    frontmatter = BlobStorageService._parse_frontmatter(content)
    result = validate_frontmatter(frontmatter)

    # Check name matches directory
    if frontmatter.get("name") != name:
        result.add_error("name", f"name '{frontmatter.get('name')}' does not match directory '{name}'")

    line_count = len(content.splitlines())
    if line_count > 500:
        result.add_warning("body", f"SKILL.md has {line_count} lines (recommended < 500)")

    return {"valid": result.valid, "errors": result.errors, "warnings": result.warnings}
```

- [ ] **Step 3: Mount router in main app**

Update `backend/app/main.py` — add after CORS middleware:
```python
from app.routers.skills import router as skills_router

app.include_router(skills_router)
```

Full `backend/app/main.py`:
```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers.skills import router as skills_router

app = FastAPI(title="Agent Platform API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(skills_router)


@app.get("/api/health")
async def health():
    return {"status": "ok"}
```

- [ ] **Step 4: Run all backend tests**

```bash
cd backend
python -m pytest tests/ -v
```

Expected: All existing tests PASS

- [ ] **Step 5: Commit**

```bash
git add backend/app/models/ backend/app/routers/ backend/app/main.py
git commit -m "feat: add Skills CRUD API with template generation and validation"
```

---

## Phase 4: Frontend — Layout and Routing

### Task 8: API Client and Layout Shell

**Files:**
- Create: `frontend/src/api/axiosClient.ts`
- Create: `frontend/src/api/skillsApi.ts`
- Create: `frontend/src/components/layout/Sidebar.tsx`
- Create: `frontend/src/components/layout/TopBar.tsx`
- Create: `frontend/src/components/layout/AppLayout.tsx`
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/main.tsx`

- [ ] **Step 1: Create Axios client with auth interceptor**

Create `frontend/src/api/axiosClient.ts`:
```typescript
import axios from "axios";
import { PublicClientApplication } from "@azure/msal-browser";
import { msalConfig, loginScopes } from "../auth/msalConfig";

const apiClient = axios.create({
  baseURL: "/api",
});

apiClient.interceptors.request.use(async (config) => {
  const msalInstance = new PublicClientApplication(msalConfig);
  await msalInstance.initialize();
  const accounts = msalInstance.getAllAccounts();
  if (accounts.length > 0) {
    try {
      const response = await msalInstance.acquireTokenSilent({
        scopes: loginScopes,
        account: accounts[0],
      });
      config.headers.Authorization = `Bearer ${response.accessToken}`;
    } catch {
      // Token acquisition failed — request will proceed without auth
      // and backend will return 401
    }
  }
  return config;
});

export default apiClient;
```

- [ ] **Step 2: Create Skills API functions**

Create `frontend/src/api/skillsApi.ts`:
```typescript
import apiClient from "./axiosClient";
import type {
  Skill,
  SkillListResponse,
  SkillDetail,
  SkillCreateRequest,
  ValidationResult,
} from "../types/skill";

export async function listSkills(): Promise<SkillListResponse> {
  const { data } = await apiClient.get<SkillListResponse>("/skills");
  return data;
}

export async function getSkill(name: string): Promise<SkillDetail> {
  const { data } = await apiClient.get<SkillDetail>(`/skills/${name}`);
  return data;
}

export async function createSkill(req: SkillCreateRequest): Promise<Skill> {
  const { data } = await apiClient.post<Skill>("/skills", req);
  return data;
}

export async function deleteSkill(name: string): Promise<void> {
  await apiClient.delete(`/skills/${name}`);
}

export async function readFile(
  skillName: string,
  filePath: string
): Promise<string> {
  const { data } = await apiClient.get<{ path: string; content: string }>(
    `/skills/${skillName}/files/${filePath}`
  );
  return data.content;
}

export async function writeFile(
  skillName: string,
  filePath: string,
  content: string
): Promise<void> {
  await apiClient.put(`/skills/${skillName}/files/${filePath}`, { content });
}

export async function deleteFile(
  skillName: string,
  filePath: string
): Promise<void> {
  await apiClient.delete(`/skills/${skillName}/files/${filePath}`);
}

export async function validateSkill(
  name: string
): Promise<ValidationResult> {
  const { data } = await apiClient.post<ValidationResult>(
    `/skills/${name}/validate`
  );
  return data;
}
```

- [ ] **Step 3: Create Sidebar component**

Create `frontend/src/components/layout/Sidebar.tsx`:
```tsx
import { Link, useLocation } from "react-router-dom";
import { Puzzle, Bot, MessageSquare, Plug, Bell, Settings } from "lucide-react";
import { useAuth } from "../../auth/useAuth";

const navItems = [
  { path: "/skills", icon: Puzzle, label: "Skills" },
  { path: "/agents", icon: Bot, label: "Agents" },
  { path: "/prompts", icon: MessageSquare, label: "Prompts" },
  { path: "/mcp", icon: Plug, label: "MCP Servers" },
];

export function Sidebar() {
  const location = useLocation();
  const { user, logout } = useAuth();

  return (
    <aside className="flex flex-col w-16 hover:w-56 transition-all duration-200 bg-sidebar group overflow-hidden shrink-0 h-screen border-r border-white/10">
      {/* Logo */}
      <div className="flex items-center h-12 px-4 mt-2">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
          <Puzzle className="w-4 h-4 text-white" />
        </div>
        <span className="ml-3 text-white font-semibold text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
          Agent Platform
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 mt-6 space-y-1 px-2">
        {navItems.map((item) => {
          const isActive = location.pathname.startsWith(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center h-10 rounded-lg px-3 transition-colors ${
                isActive
                  ? "bg-sidebar-hover text-white border-l-[3px] border-primary"
                  : "text-text-muted hover:text-white hover:bg-sidebar-hover"
              }`}
            >
              <item.icon className="w-5 h-5 shrink-0" />
              <span className="ml-3 text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="px-2 pb-4 space-y-1">
        <button className="flex items-center h-10 w-full rounded-lg px-3 text-text-muted hover:text-white hover:bg-sidebar-hover transition-colors">
          <Bell className="w-5 h-5 shrink-0" />
          <span className="ml-3 text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
            Notifications
          </span>
        </button>
        <button
          onClick={logout}
          className="flex items-center h-10 w-full rounded-lg px-3 text-text-muted hover:text-white hover:bg-sidebar-hover transition-colors"
        >
          <div className="w-5 h-5 rounded-full bg-primary text-white text-xs flex items-center justify-center shrink-0">
            {user?.name?.charAt(0) || "U"}
          </div>
          <span className="ml-3 text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
            {user?.name || "User"}
          </span>
        </button>
      </div>
    </aside>
  );
}
```

- [ ] **Step 4: Create TopBar and AppLayout**

Create `frontend/src/components/layout/TopBar.tsx`:
```tsx
import { ReactNode } from "react";

interface TopBarProps {
  children: ReactNode;
}

export function TopBar({ children }: TopBarProps) {
  return (
    <header className="h-12 border-b border-border bg-card flex items-center px-6 shrink-0">
      {children}
    </header>
  );
}
```

Create `frontend/src/components/layout/AppLayout.tsx`:
```tsx
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";

export function AppLayout() {
  return (
    <div className="flex h-screen bg-surface">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
}
```

- [ ] **Step 5: Set up routing in App.tsx and main.tsx**

Replace `frontend/src/App.tsx`:
```tsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "./auth/AuthProvider";
import { AppLayout } from "./components/layout/AppLayout";
import { SkillListPage } from "./pages/skills/SkillListPage";
import { SkillCreatePage } from "./pages/skills/SkillCreatePage";
import { SkillEditorPage } from "./pages/skills/SkillEditorPage";
import { SkillDetailPage } from "./pages/skills/SkillDetailPage";

const queryClient = new QueryClient();

export default function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Routes>
            <Route element={<AppLayout />}>
              <Route path="/" element={<Navigate to="/skills" replace />} />
              <Route path="/skills" element={<SkillListPage />} />
              <Route path="/skills/new" element={<SkillCreatePage />} />
              <Route path="/skills/:name/edit" element={<SkillEditorPage />} />
              <Route path="/skills/:name" element={<SkillDetailPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </QueryClientProvider>
    </AuthProvider>
  );
}
```

Replace `frontend/src/main.tsx`:
```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

- [ ] **Step 6: Create placeholder page components**

Create `frontend/src/pages/skills/SkillListPage.tsx`:
```tsx
export function SkillListPage() {
  return <div className="p-8">Skills List — TODO</div>;
}
```

Create `frontend/src/pages/skills/SkillCreatePage.tsx`:
```tsx
export function SkillCreatePage() {
  return <div className="p-8">Create Skill — TODO</div>;
}
```

Create `frontend/src/pages/skills/SkillEditorPage.tsx`:
```tsx
export function SkillEditorPage() {
  return <div className="p-8">Skill Editor — TODO</div>;
}
```

Create `frontend/src/pages/skills/SkillDetailPage.tsx`:
```tsx
export function SkillDetailPage() {
  return <div className="p-8">Skill Detail — TODO</div>;
}
```

- [ ] **Step 7: Verify frontend compiles and routing works**

```bash
cd frontend
npm run dev
```

Navigate to `http://localhost:5173/skills` — expect sidebar + "Skills List — TODO".
Navigate to `/skills/new` — expect "Create Skill — TODO".

- [ ] **Step 8: Commit**

```bash
git add frontend/src/
git commit -m "feat: add app layout with sidebar, routing, and API client"
```

---

## Phase 5: Frontend Pages

### Task 9: Skills List Page

**Files:**
- Create: `frontend/src/hooks/useSkills.ts`
- Create: `frontend/src/components/skills/SkillCard.tsx`
- Create: `frontend/src/components/skills/SkillMetadataPills.tsx`
- Create: `frontend/src/components/ui/SearchInput.tsx`
- Create: `frontend/src/components/ui/Breadcrumb.tsx`
- Create: `frontend/src/components/ui/EmptyState.tsx`
- Modify: `frontend/src/pages/skills/SkillListPage.tsx`

- [ ] **Step 1: Create React Query hooks**

Create `frontend/src/hooks/useSkills.ts`:
```typescript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listSkills,
  getSkill,
  createSkill,
  deleteSkill,
  validateSkill,
} from "../api/skillsApi";
import type { SkillCreateRequest } from "../types/skill";

export function useSkillList() {
  return useQuery({
    queryKey: ["skills"],
    queryFn: listSkills,
  });
}

export function useSkillDetail(name: string) {
  return useQuery({
    queryKey: ["skills", name],
    queryFn: () => getSkill(name),
    enabled: !!name,
  });
}

export function useCreateSkill() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (req: SkillCreateRequest) => createSkill(req),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["skills"] }),
  });
}

export function useDeleteSkill() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => deleteSkill(name),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["skills"] }),
  });
}

export function useValidateSkill() {
  return useMutation({
    mutationFn: (name: string) => validateSkill(name),
  });
}
```

- [ ] **Step 2: Create shared UI components**

Create `frontend/src/components/ui/SearchInput.tsx`:
```tsx
import { Search } from "lucide-react";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function SearchInput({ value, onChange, placeholder = "Search..." }: SearchInputProps) {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="pl-9 pr-4 py-2 w-60 rounded-lg bg-surface border border-border text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
      />
    </div>
  );
}
```

Create `frontend/src/components/ui/Breadcrumb.tsx`:
```tsx
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

export function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav className="flex items-center gap-1.5 text-sm">
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i > 0 && <ChevronRight className="w-3.5 h-3.5 text-text-muted" />}
          {item.href ? (
            <Link to={item.href} className="text-primary hover:underline">
              {item.label}
            </Link>
          ) : (
            <span className="text-text-primary font-medium">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
```

Create `frontend/src/components/ui/EmptyState.tsx`:
```tsx
import { Plus } from "lucide-react";
import { Link } from "react-router-dom";

export function EmptyState() {
  return (
    <Link
      to="/skills/new"
      className="flex flex-col items-center justify-center h-48 rounded-xl border-2 border-dashed border-border hover:border-primary hover:bg-primary/5 transition-colors cursor-pointer"
    >
      <Plus className="w-12 h-12 text-text-muted" />
      <span className="mt-2 text-sm text-text-muted">Create new skill</span>
    </Link>
  );
}
```

- [ ] **Step 3: Create SkillMetadataPills and SkillCard**

Create `frontend/src/components/skills/SkillMetadataPills.tsx`:
```tsx
interface SkillMetadataPillsProps {
  version?: string;
  author?: string;
  license?: string;
  compatibility?: string;
}

const pillStyles = {
  version: "bg-primary/10 text-primary",
  author: "bg-surface text-text-secondary",
  license: "bg-success/10 text-success",
  compatibility: "bg-warning/10 text-warning",
} as const;

export function SkillMetadataPills({ version, author, license, compatibility }: SkillMetadataPillsProps) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {version && (
        <span className={`px-2 py-0.5 rounded text-xs font-medium ${pillStyles.version}`}>
          v{version}
        </span>
      )}
      {author && (
        <span className={`px-2 py-0.5 rounded text-xs font-medium ${pillStyles.author}`}>
          {author}
        </span>
      )}
      {license && (
        <span className={`px-2 py-0.5 rounded text-xs font-medium ${pillStyles.license}`}>
          {license}
        </span>
      )}
      {compatibility && (
        <span className={`px-2 py-0.5 rounded text-xs font-medium ${pillStyles.compatibility}`}>
          {compatibility}
        </span>
      )}
    </div>
  );
}
```

Create `frontend/src/components/skills/SkillCard.tsx`:
```tsx
import { Link } from "react-router-dom";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import type { Skill } from "../../types/skill";
import { SkillMetadataPills } from "./SkillMetadataPills";

const iconColors = [
  "bg-primary/10 text-primary",
  "bg-purple-500/10 text-purple-500",
  "bg-warning/10 text-warning",
  "bg-success/10 text-success",
  "bg-pink-500/10 text-pink-500",
];

interface SkillCardProps {
  skill: Skill;
  index: number;
  onDelete: (name: string) => void;
}

export function SkillCard({ skill, index, onDelete }: SkillCardProps) {
  const colorClass = iconColors[index % iconColors.length];

  return (
    <Link
      to={`/skills/${skill.name}`}
      className="block p-5 bg-card rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.08),0_8px_24px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_16px_rgba(59,130,246,0.15)] hover:border-primary border border-transparent transition-all group"
    >
      <div className="flex items-start justify-between">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg ${colorClass}`}>
          &gt;_
        </div>
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-surface transition-all"
        >
          <MoreHorizontal className="w-4 h-4 text-text-muted" />
        </button>
      </div>

      <h3 className="mt-3 font-mono font-semibold text-text-primary">{skill.name}</h3>

      <p className="mt-1 text-sm text-text-secondary line-clamp-2">{skill.description}</p>

      <div className="mt-4">
        <SkillMetadataPills
          version={skill.metadata?.version}
          author={skill.metadata?.author}
          license={skill.license || undefined}
        />
      </div>
    </Link>
  );
}
```

- [ ] **Step 4: Implement SkillListPage**

Replace `frontend/src/pages/skills/SkillListPage.tsx`:
```tsx
import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import { TopBar } from "../../components/layout/TopBar";
import { Breadcrumb } from "../../components/ui/Breadcrumb";
import { SearchInput } from "../../components/ui/SearchInput";
import { SkillCard } from "../../components/skills/SkillCard";
import { EmptyState } from "../../components/ui/EmptyState";
import { useSkillList, useDeleteSkill } from "../../hooks/useSkills";

export function SkillListPage() {
  const [search, setSearch] = useState("");
  const { data, isLoading } = useSkillList();
  const deleteMutation = useDeleteSkill();

  const skills = data?.skills ?? [];
  const filtered = skills.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <TopBar>
        <Breadcrumb items={[{ label: "Skills" }]} />
      </TopBar>

      <div className="flex-1 overflow-auto p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-mono font-bold text-text-primary">Skills</h1>
            <span className="text-sm text-text-muted">{data?.total ?? 0} skills</span>
          </div>
          <div className="flex items-center gap-3">
            <SearchInput value={search} onChange={setSearch} placeholder="Search skills..." />
            <Link
              to="/skills/new"
              className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover text-white text-sm font-medium rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Skill
            </Link>
          </div>
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="text-text-muted">Loading...</div>
        ) : (
          <div className="grid grid-cols-3 gap-5">
            {filtered.map((skill, i) => (
              <SkillCard
                key={skill.name}
                skill={skill}
                index={i}
                onDelete={(name) => deleteMutation.mutate(name)}
              />
            ))}
            <EmptyState />
          </div>
        )}

        {/* Footer */}
        {data && (
          <div className="mt-6 text-sm text-text-muted">
            Showing {filtered.length} of {data.total} skills
          </div>
        )}
      </div>
    </>
  );
}
```

- [ ] **Step 5: Verify list page renders**

```bash
cd frontend
npm run dev
```

Navigate to `http://localhost:5173/skills` — expect the list page layout with search bar, "New Skill" button, and empty state card. (No real data until backend is connected.)

- [ ] **Step 6: Commit**

```bash
git add frontend/src/
git commit -m "feat: implement Skills list page with cards, search, and empty state"
```

---

### Task 10: Skill Create Page

**Files:**
- Create: `frontend/src/components/skills/TemplateCard.tsx`
- Modify: `frontend/src/pages/skills/SkillCreatePage.tsx`

- [ ] **Step 1: Create TemplateCard component**

Create `frontend/src/components/skills/TemplateCard.tsx`:
```tsx
import { Check } from "lucide-react";
import type { ReactNode } from "react";

interface TemplateCardProps {
  icon: ReactNode;
  title: string;
  description: string;
  selected: boolean;
  onClick: () => void;
}

export function TemplateCard({ icon, title, description, selected, onClick }: TemplateCardProps) {
  return (
    <button
      onClick={onClick}
      className={`relative text-left p-5 rounded-xl border-2 transition-all ${
        selected
          ? "border-primary bg-primary/5"
          : "border-border bg-card hover:border-text-muted"
      }`}
    >
      {selected && (
        <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
          <Check className="w-3 h-3 text-white" />
        </div>
      )}
      <div className="text-2xl mb-3">{icon}</div>
      <h3 className="font-mono font-semibold text-text-primary text-sm">{title}</h3>
      <p className="mt-1 text-xs text-text-secondary leading-relaxed">{description}</p>
    </button>
  );
}
```

- [ ] **Step 2: Implement SkillCreatePage with two-step wizard**

Replace `frontend/src/pages/skills/SkillCreatePage.tsx`:
```tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileText, Terminal, BookOpen, Plug, ArrowRight } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { TopBar } from "../../components/layout/TopBar";
import { Breadcrumb } from "../../components/ui/Breadcrumb";
import { TemplateCard } from "../../components/skills/TemplateCard";
import { useCreateSkill } from "../../hooks/useSkills";

const templates = [
  {
    id: "blank" as const,
    icon: <FileText className="w-8 h-8 text-primary" />,
    title: "Blank Skeleton",
    description: "Standard structure with SKILL.md, scripts/, references/, assets/",
    tree: "SKILL.md\nscripts/\nreferences/\nassets/",
  },
  {
    id: "script" as const,
    icon: <Terminal className="w-8 h-8 text-warning" />,
    title: "Script-based Skill",
    description: "Multiple executable scripts with CLI arguments. Ideal for API integrations and data processing.",
    tree: "SKILL.md\nscripts/\n  main.py\nreferences/\n  REFERENCE.md\nassets/",
  },
  {
    id: "instruction" as const,
    icon: <BookOpen className="w-8 h-8 text-purple-500" />,
    title: "Instruction-only Skill",
    description: "Pure prompt engineering — only SKILL.md with detailed agent instructions. No scripts needed.",
    tree: "SKILL.md\nreferences/\nassets/",
  },
  {
    id: "mcp" as const,
    icon: <Plug className="w-8 h-8 text-success" />,
    title: "MCP Integration",
    description: "Scripts that call external APIs and MCP servers. Includes authentication boilerplate code.",
    tree: "SKILL.md\nscripts/\n  client.py\nreferences/\n  API.md\nassets/",
  },
];

const nameRegex = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;

const basicInfoSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(64, "Max 64 characters")
    .regex(nameRegex, "Lowercase letters, numbers, and hyphens only. Cannot start/end with hyphen.")
    .refine((v) => !v.includes("--"), "Cannot contain consecutive hyphens"),
  description: z
    .string()
    .min(1, "Description is required")
    .max(1024, "Max 1024 characters"),
  license: z.string().optional(),
  author: z.string().optional(),
  version: z.string().optional(),
});

type BasicInfoForm = z.infer<typeof basicInfoSchema>;

export function SkillCreatePage() {
  const navigate = useNavigate();
  const createMutation = useCreateSkill();
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("blank");

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<BasicInfoForm>({
    resolver: zodResolver(basicInfoSchema),
    defaultValues: { license: "MIT", version: "1.0" },
  });

  const descriptionLength = watch("description")?.length ?? 0;
  const currentTemplate = templates.find((t) => t.id === selectedTemplate)!;

  const onSubmit = async (data: BasicInfoForm) => {
    const metadata: Record<string, string> = {};
    if (data.author) metadata.author = data.author;
    if (data.version) metadata.version = data.version;

    await createMutation.mutateAsync({
      name: data.name,
      description: data.description,
      template: selectedTemplate as "blank" | "script" | "instruction" | "mcp",
      license: data.license || undefined,
      metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
    });

    navigate(`/skills/${data.name}/edit`);
  };

  return (
    <>
      <TopBar>
        <Breadcrumb
          items={[
            { label: "Skills", href: "/skills" },
            { label: "New Skill" },
          ]}
        />
      </TopBar>

      <div className="flex-1 overflow-auto p-8 max-w-4xl mx-auto">
        {/* Stepper */}
        <div className="flex items-center justify-center gap-4 mb-10">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${step >= 1 ? "bg-primary text-white" : "bg-border text-text-muted"}`}>
              1
            </div>
            <span className={`font-mono text-sm ${step >= 1 ? "text-text-primary" : "text-text-muted"}`}>
              Choose Template
            </span>
          </div>
          <div className={`w-12 h-0.5 ${step >= 2 ? "bg-primary" : "bg-border"}`} />
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${step >= 2 ? "bg-primary text-white" : "bg-border text-text-muted"}`}>
              2
            </div>
            <span className={`font-mono text-sm ${step >= 2 ? "text-text-primary" : "text-text-muted"}`}>
              Basic Info
            </span>
          </div>
        </div>

        {step === 1 && (
          <div className="flex gap-8">
            {/* Template cards */}
            <div className="flex-1">
              <h2 className="text-lg font-medium text-text-primary mb-1">Choose a starting point</h2>
              <p className="text-sm text-text-secondary mb-6">
                Select a template that matches your use case. You can customize everything later.
              </p>
              <div className="grid grid-cols-2 gap-4">
                {templates.map((t) => (
                  <TemplateCard
                    key={t.id}
                    icon={t.icon}
                    title={t.title}
                    description={t.description}
                    selected={selectedTemplate === t.id}
                    onClick={() => setSelectedTemplate(t.id)}
                  />
                ))}
              </div>
            </div>

            {/* Preview panel */}
            <div className="w-72">
              <div className="p-4 bg-surface border border-border rounded-xl">
                <div className="text-xs text-text-muted uppercase tracking-wider mb-3">Preview</div>
                <pre className="font-mono text-sm text-text-primary leading-relaxed">
                  {currentTemplate.tree}
                </pre>
                <div className="mt-4 text-xs text-text-muted uppercase tracking-wider mb-2">
                  Generated SKILL.md frontmatter:
                </div>
                <pre className="font-mono text-xs bg-editor-bg text-green-400 p-3 rounded-lg leading-relaxed">
{`---
name: my-skill
description: ""
---`}
                </pre>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <form onSubmit={handleSubmit(onSubmit)} className="max-w-lg">
            <h2 className="text-lg font-medium text-text-primary mb-6">Basic information</h2>

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  Name <span className="text-danger">*</span>
                </label>
                <input
                  {...register("name")}
                  className="w-full px-3 py-2 border border-border rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  placeholder="my-awesome-skill"
                />
                {errors.name && <p className="mt-1 text-xs text-danger">{errors.name.message}</p>}
                <p className="mt-1 text-xs text-text-muted">Lowercase letters, numbers, and hyphens. 1-64 chars.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  Description <span className="text-danger">*</span>
                </label>
                <textarea
                  {...register("description")}
                  rows={3}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
                  placeholder="Describe what this skill does and when to use it..."
                />
                <div className="flex justify-between mt-1">
                  {errors.description && <p className="text-xs text-danger">{errors.description.message}</p>}
                  <span className="text-xs text-text-muted ml-auto">{descriptionLength}/1024</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">License</label>
                  <select
                    {...register("license")}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    <option value="MIT">MIT</option>
                    <option value="Apache-2.0">Apache 2.0</option>
                    <option value="Proprietary">Proprietary</option>
                    <option value="">None</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">Author</label>
                  <input
                    {...register("author")}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    placeholder="your-name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">Version</label>
                  <input
                    {...register("version")}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    placeholder="1.0"
                  />
                </div>
              </div>
            </div>

            <div className="mt-8 flex justify-end gap-3">
              <button type="button" onClick={() => setStep(1)} className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary">
                Back
              </button>
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="px-6 py-2 bg-primary hover:bg-primary-hover text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                {createMutation.isPending ? "Creating..." : "Create Skill"}
              </button>
            </div>
          </form>
        )}

        {/* Bottom bar for Step 1 */}
        {step === 1 && (
          <div className="mt-8 flex justify-end gap-3">
            <button
              onClick={() => navigate("/skills")}
              className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary"
            >
              Cancel
            </button>
            <button
              onClick={() => setStep(2)}
              className="flex items-center gap-2 px-6 py-2 bg-primary hover:bg-primary-hover text-white text-sm font-medium rounded-lg transition-colors"
            >
              Next <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </>
  );
}
```

- [ ] **Step 3: Verify create page**

```bash
cd frontend
npm run dev
```

Navigate to `/skills/new`. Verify: stepper shows, template cards render and are selectable, clicking "Next" goes to step 2, form fields validate.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/
git commit -m "feat: implement Skill creation wizard with template selection and form validation"
```

---

### Task 11: Skill Editor Page (Monaco Editor)

**Files:**
- Create: `frontend/src/hooks/useSkillFiles.ts`
- Create: `frontend/src/components/skills/FileTree.tsx`
- Modify: `frontend/src/pages/skills/SkillEditorPage.tsx`

- [ ] **Step 1: Create file operation hooks**

Create `frontend/src/hooks/useSkillFiles.ts`:
```typescript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { readFile, writeFile } from "../api/skillsApi";

export function useFileContent(skillName: string, filePath: string | null) {
  return useQuery({
    queryKey: ["skill-file", skillName, filePath],
    queryFn: () => readFile(skillName, filePath!),
    enabled: !!filePath,
  });
}

export function useSaveFile(skillName: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ path, content }: { path: string; content: string }) =>
      writeFile(skillName, path, content),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["skill-file", skillName, variables.path],
      });
      queryClient.invalidateQueries({ queryKey: ["skills", skillName] });
    },
  });
}
```

- [ ] **Step 2: Create FileTree component**

Create `frontend/src/components/skills/FileTree.tsx`:
```tsx
import { useState } from "react";
import { ChevronRight, ChevronDown, File, Folder, FolderOpen, Plus, FolderPlus } from "lucide-react";
import type { SkillFile } from "../../types/skill";

interface TreeNode {
  name: string;
  path: string;
  isDirectory: boolean;
  children: TreeNode[];
  size: number;
}

function buildTree(files: SkillFile[]): TreeNode[] {
  const root: TreeNode[] = [];

  for (const file of files) {
    const parts = file.path.split("/");
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const isLast = i === parts.length - 1;
      const name = parts[i];
      const path = parts.slice(0, i + 1).join("/");

      let node = current.find((n) => n.name === name);
      if (!node) {
        node = {
          name,
          path,
          isDirectory: !isLast,
          children: [],
          size: isLast ? file.size : 0,
        };
        current.push(node);
      }
      current = node.children;
    }
  }

  return root;
}

interface FileTreeProps {
  files: SkillFile[];
  selectedPath: string | null;
  onSelectFile: (path: string) => void;
}

function TreeItem({
  node,
  depth,
  selectedPath,
  onSelectFile,
}: {
  node: TreeNode;
  depth: number;
  selectedPath: string | null;
  onSelectFile: (path: string) => void;
}) {
  const [expanded, setExpanded] = useState(depth === 0);
  const isSelected = selectedPath === node.path;

  if (node.isDirectory) {
    return (
      <div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center w-full h-7 px-2 text-sm text-gray-300 hover:bg-white/5 transition-colors"
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
        >
          {expanded ? (
            <ChevronDown className="w-3.5 h-3.5 mr-1 shrink-0" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 mr-1 shrink-0" />
          )}
          {expanded ? (
            <FolderOpen className="w-4 h-4 mr-2 text-amber-400 shrink-0" />
          ) : (
            <Folder className="w-4 h-4 mr-2 text-amber-400 shrink-0" />
          )}
          <span className="truncate">{node.name}</span>
        </button>
        {expanded &&
          node.children
            .sort((a, b) => {
              if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
              return a.name.localeCompare(b.name);
            })
            .map((child) => (
              <TreeItem
                key={child.path}
                node={child}
                depth={depth + 1}
                selectedPath={selectedPath}
                onSelectFile={onSelectFile}
              />
            ))}
      </div>
    );
  }

  return (
    <button
      onClick={() => onSelectFile(node.path)}
      className={`flex items-center w-full h-7 px-2 text-sm transition-colors ${
        isSelected
          ? "bg-white/10 text-white border-l-2 border-primary"
          : "text-gray-400 hover:bg-white/5 hover:text-gray-200"
      }`}
      style={{ paddingLeft: `${depth * 16 + 8}px` }}
    >
      <File className="w-4 h-4 mr-2 text-primary shrink-0" />
      <span className="truncate">{node.name}</span>
    </button>
  );
}

export function FileTree({ files, selectedPath, onSelectFile }: FileTreeProps) {
  const tree = buildTree(files);

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 text-[11px] uppercase tracking-wider text-gray-500 font-semibold">
        Explorer
      </div>
      <div className="flex-1 overflow-auto">
        {tree
          .sort((a, b) => {
            if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
            return a.name.localeCompare(b.name);
          })
          .map((node) => (
            <TreeItem
              key={node.path}
              node={node}
              depth={0}
              selectedPath={selectedPath}
              onSelectFile={onSelectFile}
            />
          ))}
      </div>
      <div className="flex gap-1 p-2 border-t border-white/10">
        <button className="p-1.5 rounded text-gray-500 hover:text-gray-300 hover:bg-white/5">
          <Plus className="w-4 h-4" />
        </button>
        <button className="p-1.5 rounded text-gray-500 hover:text-gray-300 hover:bg-white/5">
          <FolderPlus className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Implement SkillEditorPage with Monaco**

Replace `frontend/src/pages/skills/SkillEditorPage.tsx`:
```tsx
import { useState, useCallback, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Editor, { type OnMount } from "@monaco-editor/react";
import { ArrowLeft, Check, Eye, Save, MoreHorizontal } from "lucide-react";
import { FileTree } from "../../components/skills/FileTree";
import { useSkillDetail, useValidateSkill } from "../../hooks/useSkills";
import { useFileContent, useSaveFile } from "../../hooks/useSkillFiles";

function getLanguage(path: string): string {
  if (path.endsWith(".md")) return "markdown";
  if (path.endsWith(".py")) return "python";
  if (path.endsWith(".js")) return "javascript";
  if (path.endsWith(".ts")) return "typescript";
  if (path.endsWith(".json")) return "json";
  if (path.endsWith(".yaml") || path.endsWith(".yml")) return "yaml";
  if (path.endsWith(".sh")) return "shell";
  return "plaintext";
}

export function SkillEditorPage() {
  const { name } = useParams<{ name: string }>();
  const navigate = useNavigate();
  const { data: skill } = useSkillDetail(name!);
  const [selectedFile, setSelectedFile] = useState<string | null>("SKILL.md");
  const [editorContent, setEditorContent] = useState<string>("");
  const [isDirty, setIsDirty] = useState(false);
  const editorRef = useRef<any>(null);

  const { data: fileContent } = useFileContent(name!, selectedFile);
  const saveMutation = useSaveFile(name!);
  const validateMutation = useValidateSkill();

  // Sync fetched content to editor
  useEffect(() => {
    if (fileContent !== undefined) {
      setEditorContent(fileContent);
      setIsDirty(false);
    }
  }, [fileContent]);

  const handleEditorMount: OnMount = (editor) => {
    editorRef.current = editor;
    // Cmd+S to save
    editor.addAction({
      id: "save-file",
      label: "Save File",
      keybindings: [2048 | 49], // Cmd+S
      run: () => handleSave(),
    });
  };

  const handleSave = useCallback(() => {
    if (!selectedFile || !editorContent) return;
    saveMutation.mutate(
      { path: selectedFile, content: editorContent },
      { onSuccess: () => setIsDirty(false) }
    );
  }, [selectedFile, editorContent, saveMutation]);

  const handleValidate = useCallback(() => {
    if (name) validateMutation.mutate(name);
  }, [name, validateMutation]);

  const handleFileSelect = (path: string) => {
    if (path.endsWith(".gitkeep")) return;
    setSelectedFile(path);
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Editor top bar */}
      <div className="flex items-center justify-between h-11 px-4 bg-editor-topbar border-b border-white/10 shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(`/skills/${name}`)} className="text-gray-400 hover:text-white">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <span className="text-white font-mono font-semibold text-sm">{name}</span>
          {skill?.metadata?.version && (
            <span className="px-1.5 py-0.5 rounded text-[10px] bg-primary text-white font-medium">
              v{skill.metadata.version}
            </span>
          )}
          <span className={`flex items-center gap-1 text-xs ${isDirty ? "text-warning" : "text-success"}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isDirty ? "bg-warning" : "bg-success"}`} />
            {isDirty ? "Unsaved" : "Saved"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleValidate}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-gray-600 text-gray-300 hover:text-white hover:border-gray-400 rounded-md transition-colors"
          >
            <Check className="w-3.5 h-3.5" /> Validate
          </button>
          <button
            onClick={() => navigate(`/skills/${name}`)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-gray-600 text-gray-300 hover:text-white hover:border-gray-400 rounded-md transition-colors"
          >
            <Eye className="w-3.5 h-3.5" /> Preview
          </button>
          <button
            onClick={handleSave}
            disabled={!isDirty || saveMutation.isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-primary hover:bg-primary-hover text-white rounded-md transition-colors disabled:opacity-40"
          >
            <Save className="w-3.5 h-3.5" /> Save
          </button>
        </div>
      </div>

      {/* Editor body */}
      <div className="flex flex-1 overflow-hidden">
        {/* File explorer */}
        <div className="w-60 bg-editor-panel border-r border-white/10 shrink-0">
          {skill?.files && (
            <FileTree
              files={skill.files}
              selectedPath={selectedFile}
              onSelectFile={handleFileSelect}
            />
          )}
        </div>

        {/* Monaco editor */}
        <div className="flex-1 flex flex-col">
          {/* Tab bar */}
          {selectedFile && (
            <div className="flex items-center h-9 bg-editor-panel border-b border-white/10 px-2">
              <div className="flex items-center gap-2 px-3 py-1 bg-editor-bg rounded-t text-xs text-white font-mono">
                {selectedFile}
              </div>
            </div>
          )}

          {/* Editor */}
          <div className="flex-1">
            <Editor
              theme="vs-dark"
              language={selectedFile ? getLanguage(selectedFile) : "plaintext"}
              value={editorContent}
              onChange={(value) => {
                setEditorContent(value ?? "");
                setIsDirty(true);
              }}
              onMount={handleEditorMount}
              options={{
                fontSize: 14,
                fontFamily: "JetBrains Mono, monospace",
                minimap: { enabled: true },
                lineNumbers: "on",
                renderLineHighlight: "line",
                scrollBeyondLastLine: false,
                padding: { top: 12 },
                wordWrap: "on",
              }}
            />
          </div>

          {/* Status bar */}
          <div className="flex items-center justify-between h-6 px-3 bg-sidebar text-[11px] text-gray-500 shrink-0">
            <div className="flex items-center gap-3">
              <span>{selectedFile ? getLanguage(selectedFile).charAt(0).toUpperCase() + getLanguage(selectedFile).slice(1) : ""}</span>
              <span>UTF-8</span>
            </div>
            <div className="flex items-center gap-3">
              {validateMutation.data && (
                <span className={validateMutation.data.valid ? "text-success" : "text-danger"}>
                  agentskills.io {validateMutation.data.valid ? "compatible ✓" : "issues found"}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Verify editor page**

```bash
cd frontend
npm run dev
```

Navigate to `/skills/crm-opportunity/edit`. Verify: file tree renders, Monaco editor loads with dark theme, tab bar shows file name, status bar visible.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/
git commit -m "feat: implement Skill editor page with Monaco Editor and file tree"
```

---

### Task 12: Skill Detail/Preview Page

**Files:**
- Create: `frontend/src/components/skills/MarkdownRenderer.tsx`
- Modify: `frontend/src/pages/skills/SkillDetailPage.tsx`

- [ ] **Step 1: Create MarkdownRenderer component**

Create `frontend/src/components/skills/MarkdownRenderer.tsx`:
```tsx
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Copy, Check } from "lucide-react";
import { useState } from "react";

function CodeBlock({ language, children }: { language: string; children: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(children);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group my-4 rounded-xl overflow-hidden border-l-[3px] border-primary">
      <button
        onClick={handleCopy}
        className="absolute right-2 top-2 p-1.5 rounded-md bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-white"
      >
        {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
      </button>
      <SyntaxHighlighter
        language={language || "text"}
        style={oneDark}
        customStyle={{ margin: 0, borderRadius: 0, fontSize: "13px", fontFamily: "JetBrains Mono, monospace" }}
      >
        {children}
      </SyntaxHighlighter>
    </div>
  );
}

export function MarkdownRenderer({ content }: { content: string }) {
  // Strip frontmatter
  let body = content;
  if (body.startsWith("---")) {
    const parts = body.split("---");
    if (parts.length >= 3) {
      body = parts.slice(2).join("---").trim();
    }
  }

  return (
    <div className="prose prose-sm max-w-none prose-headings:font-mono prose-headings:text-text-primary prose-p:text-text-secondary prose-a:text-primary prose-strong:text-text-primary prose-code:text-primary prose-code:bg-primary/10 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-code:font-mono prose-table:text-sm">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={{
          code({ className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || "");
            const codeString = String(children).replace(/\n$/, "");
            if (match) {
              return <CodeBlock language={match[1]}>{codeString}</CodeBlock>;
            }
            return <code className={className} {...props}>{children}</code>;
          },
        }}
      >
        {body}
      </ReactMarkdown>
    </div>
  );
}
```

- [ ] **Step 2: Implement SkillDetailPage**

Replace `frontend/src/pages/skills/SkillDetailPage.tsx`:
```tsx
import { useParams, useNavigate, Link } from "react-router-dom";
import { Pencil, Download, Trash2, File, Folder, Copy, Check } from "lucide-react";
import { useState } from "react";
import { TopBar } from "../../components/layout/TopBar";
import { Breadcrumb } from "../../components/ui/Breadcrumb";
import { SkillMetadataPills } from "../../components/skills/SkillMetadataPills";
import { MarkdownRenderer } from "../../components/skills/MarkdownRenderer";
import { useSkillDetail, useDeleteSkill } from "../../hooks/useSkills";
import { useFileContent } from "../../hooks/useSkillFiles";

export function SkillDetailPage() {
  const { name } = useParams<{ name: string }>();
  const navigate = useNavigate();
  const { data: skill, isLoading } = useSkillDetail(name!);
  const { data: skillMdContent } = useFileContent(name!, "SKILL.md");
  const deleteMutation = useDeleteSkill();
  const [copied, setCopied] = useState(false);

  const handleDelete = async () => {
    if (!confirm(`Delete skill "${name}"? This cannot be undone.`)) return;
    await deleteMutation.mutateAsync(name!);
    navigate("/skills");
  };

  const installCmd = `claude skill add ${name}`;
  const handleCopyInstall = () => {
    navigator.clipboard.writeText(installCmd);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) return <div className="p-8 text-text-muted">Loading...</div>;
  if (!skill) return <div className="p-8 text-danger">Skill not found</div>;

  const fileCount = skill.files?.filter((f) => !f.path.endsWith(".gitkeep")).length ?? 0;
  const dirs = new Set(skill.files?.map((f) => f.path.split("/")[0]).filter((p) => p.includes("/") || skill.files!.some((ff) => ff.path.startsWith(p + "/"))));

  return (
    <>
      <TopBar>
        <Breadcrumb items={[{ label: "Skills", href: "/skills" }, { label: name! }]} />
      </TopBar>

      <div className="flex-1 overflow-auto">
        {/* Hero header */}
        <div className="px-8 py-6 bg-card border-b border-border">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-blue-700 flex items-center justify-center text-white font-mono text-sm font-bold">
                  &gt;_
                </div>
                <h1 className="text-2xl font-mono font-bold text-text-primary">{skill.name}</h1>
              </div>
              <p className="mt-2 text-sm text-text-secondary max-w-2xl">{skill.description}</p>
              <div className="mt-3">
                <SkillMetadataPills
                  version={skill.metadata?.version}
                  author={skill.metadata?.author}
                  license={skill.license || undefined}
                  compatibility={skill.compatibility || undefined}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link
                to={`/skills/${name}/edit`}
                className="flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary-hover text-white text-sm font-medium rounded-lg transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" /> Edit
              </Link>
              <button className="flex items-center gap-1.5 px-4 py-2 border border-border text-text-secondary hover:text-text-primary text-sm rounded-lg transition-colors">
                <Download className="w-3.5 h-3.5" /> Download .skill
              </button>
              <div className="w-px h-6 bg-border mx-1" />
              <button
                onClick={handleDelete}
                className="flex items-center gap-1.5 px-3 py-2 text-danger text-sm hover:bg-danger/10 rounded-lg transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>
            </div>
          </div>
        </div>

        {/* Two column layout */}
        <div className="flex gap-8 px-8 py-6">
          {/* Left: Markdown content */}
          <div className="flex-1 min-w-0">
            {skillMdContent && <MarkdownRenderer content={skillMdContent} />}
          </div>

          {/* Right: Info sidebar */}
          <div className="w-72 shrink-0 space-y-4">
            {/* File structure */}
            <div className="p-4 bg-card rounded-xl border border-border">
              <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2 mb-3">
                <Folder className="w-4 h-4" /> File Structure
              </h3>
              <div className="space-y-1.5 font-mono text-xs">
                {skill.files
                  ?.filter((f) => !f.path.endsWith(".gitkeep"))
                  .map((f) => (
                    <div key={f.path} className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-text-secondary">
                        <File className="w-3 h-3" />
                        <span className="truncate">{f.path}</span>
                      </div>
                      <span className="text-text-muted text-[10px]">
                        {f.size > 1024 ? `${(f.size / 1024).toFixed(1)} KB` : `${f.size} B`}
                      </span>
                    </div>
                  ))}
              </div>
            </div>

            {/* Install */}
            <div className="p-4 bg-card rounded-xl border border-border">
              <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2 mb-3">
                <Download className="w-4 h-4" /> Install this Skill
              </h3>
              <div className="flex items-center gap-2 p-2 bg-surface rounded-lg">
                <code className="flex-1 text-xs font-mono text-text-secondary truncate">{installCmd}</code>
                <button onClick={handleCopyInstall} className="shrink-0 p-1 rounded hover:bg-border transition-colors">
                  {copied ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5 text-text-muted" />}
                </button>
              </div>
              <p className="mt-2 text-xs text-primary hover:underline cursor-pointer">
                Compatible with 16+ agents via agentskills.io
              </p>
            </div>

            {/* Details */}
            <div className="p-4 bg-card rounded-xl border border-border">
              <h3 className="text-sm font-semibold text-text-primary mb-3">Details</h3>
              <dl className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <dt className="text-text-muted">Created</dt>
                  <dd className="text-text-secondary">{skill.created_at ? new Date(skill.created_at).toLocaleDateString() : "-"}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-text-muted">Last modified</dt>
                  <dd className="text-text-secondary">{skill.modified_at ? new Date(skill.modified_at).toLocaleDateString() : "-"}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-text-muted">Total size</dt>
                  <dd className="text-text-secondary">{skill.total_size ? `${(skill.total_size / 1024).toFixed(1)} KB` : "-"}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-text-muted">Files</dt>
                  <dd className="text-text-secondary">{fileCount}</dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 3: Verify detail page**

```bash
cd frontend
npm run dev
```

Navigate to `/skills/crm-opportunity`. Verify: hero header, markdown rendering, code blocks with copy button, file structure sidebar, install command.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/
git commit -m "feat: implement Skill detail page with markdown rendering and install info"
```

---

## Phase 6: Integration

### Task 13: Frontend .env and End-to-End Smoke Test

**Files:**
- Create: `frontend/.env.example`
- Create: `backend/.env.example`

- [ ] **Step 1: Create environment file templates**

Create `backend/.env.example`:
```
BLOB_CONNECTION_STRING=DefaultEndpointsProtocol=https;AccountName=...
BLOB_CONTAINER_NAME=skills-container
AZURE_AD_TENANT_ID=your-tenant-id
AZURE_AD_CLIENT_ID=your-client-id
AZURE_AD_AUDIENCE=api://your-client-id
CORS_ORIGINS=["http://localhost:5173"]
```

Create `frontend/.env.example`:
```
VITE_AZURE_AD_CLIENT_ID=your-client-id
VITE_AZURE_AD_TENANT_ID=your-tenant-id
```

- [ ] **Step 2: Verify full flow locally**

Start backend:
```bash
cd backend
cp .env.example .env  # Fill in real values
uvicorn app.main:app --reload --port 8000
```

Start frontend:
```bash
cd frontend
cp .env.example .env  # Fill in real values
npm run dev
```

Smoke test:
1. Open `http://localhost:5173` → redirected to `/skills`
2. Click "+ New Skill" → wizard loads with template selection
3. Select "Blank Skeleton" → Next → fill "test-skill" + description → Create
4. Redirected to editor → file tree shows SKILL.md, scripts/, references/, assets/
5. Edit SKILL.md in Monaco editor → Save → status shows "Saved"
6. Click "Validate" → status bar shows "agentskills.io compatible ✓"
7. Click "Preview" → detail page shows rendered markdown
8. Back to list → "test-skill" card appears
9. Delete → card disappears

- [ ] **Step 3: Commit**

```bash
git add backend/.env.example frontend/.env.example
git commit -m "feat: add env templates and complete MVP integration"
```

---

## Summary

| Phase | Tasks | Description |
|-------|-------|-------------|
| 1. Scaffolding | 1-2 | Backend FastAPI + Frontend React/Vite/Tailwind |
| 2. Auth | 3-4 | Azure AD JWT middleware + MSAL frontend |
| 3. Backend API | 5-7 | Validator + Blob Storage + Skills router |
| 4. Layout | 8 | Sidebar + TopBar + routing + API client |
| 5. Pages | 9-12 | List, Create, Editor (Monaco), Detail |
| 6. Integration | 13 | Env files + end-to-end smoke test |

Total: **13 tasks**, each with 3-6 steps. Estimated execution: sequential implementation following task order.
