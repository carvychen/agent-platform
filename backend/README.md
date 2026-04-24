# Skills Platform — Backend

FastAPI backend for the Agent Platform Skills module. Provides RESTful APIs for creating, editing, importing/exporting, and installing AI agent skills following the [agentskills.io](https://agentskills.io) open standard.

Skills are stored in Azure Blob Storage with **tenant-level isolation** (via Azure AD `tid` claim). All endpoints are secured via Azure AD (Entra ID) JWT authentication with **App Roles RBAC** (SkillAdmin / SkillUser).

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | FastAPI | 0.115 |
| Server | Uvicorn | 0.30 |
| Storage | Azure Blob Storage (`DefaultAzureCredential`) | azure-storage-blob 12.23 |
| Identity | Azure Identity | 1.18 |
| Auth | Azure AD v2.0 JWT | python-jose 3.3 |
| Settings | pydantic-settings + python-dotenv | 2.6 |
| Validation | Custom validators + PyYAML frontmatter parsing | — |

## Quick Start

### Prerequisites

- Python 3.11 (pinned; see `.python-version`)
- Azure subscription with:
  - Storage Account (Blob service enabled)
  - App Registration in Entra ID (with `SkillAdmin` / `SkillUser` App Roles configured)
- Azure CLI logged in (`az login`) — required by `DefaultAzureCredential`

### Setup

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

cp .env.example .env
# Edit .env with your Azure values (see below)

uvicorn app.core.main:app --reload --port 8000
```

API available at `http://localhost:8000`. Health check: `GET /api/health`.

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `BLOB_ACCOUNT_URL` | Blob Storage account URL | `https://myaccount.blob.core.windows.net/` |
| `BLOB_ACCOUNT_NAME` | Storage account name | `myaccount` |
| `BLOB_CONTAINER_NAME` | Blob container name | `skills-container` |
| `AZURE_AD_TENANT_ID` | Entra ID tenant ID | `16b3c013-d300-...` |
| `AZURE_AD_CLIENT_ID` | App Registration client ID | `7dfbd42d-7504-...` |
| `AZURE_AD_AUDIENCE` | Token audience | `api://7dfbd42d-7504-...` |
| `CORS_ORIGINS` | Allowed origins (JSON array) | `["http://localhost:5173"]` |

## Authentication & Authorization

### Auth Flow

1. Client sends `Authorization: Bearer <token>` header
2. Backend fetches JWKS from Azure AD (cached)
3. Validates JWT signature, issuer, and audience
4. Extracts `oid`, `tid` (tenant_id), `name`, `email`, `roles` from claims
5. `tid` is used as Blob Storage virtual directory prefix for **tenant-level isolation**

### RBAC Roles

| Role | Permissions | Endpoints |
|------|-------------|-----------|
| `SkillAdmin` | Read + Write + Delete + Import | All endpoints |
| `SkillUser` | Read-only + Download + Install | GET endpoints + download/install-token/validate |

Implemented via `require_admin` and `require_any_role` FastAPI dependencies.

## API Endpoints

### General

| Method | Path | Auth | Description |
|--------|------|:----:|-------------|
| GET | `/api/health` | No | Health check |
| GET | `/api/me` | Yes | Current user info (oid, name, email, tenant_id, roles) |

### Read Endpoints (SkillAdmin + SkillUser)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/skills` | List all skills for current tenant |
| GET | `/api/skills/{name}` | Get skill metadata + file listing |
| GET | `/api/skills/{name}/files/{path}` | Read file content |
| GET | `/api/skills/{name}/download` | Download skill as ZIP |
| GET | `/api/skills/{name}/tar?token=` | Download tar.gz via install token (no auth) |
| POST | `/api/skills/{name}/install-token` | Generate short-lived install token + SAS URLs |
| POST | `/api/skills/{name}/validate` | Validate SKILL.md against agentskills.io spec |

### Write Endpoints (SkillAdmin only)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/skills` | Create skill from template |
| POST | `/api/skills/import` | Import skill from ZIP (`?overwrite=true`) |
| DELETE | `/api/skills/{name}` | Delete entire skill |
| PUT | `/api/skills/{name}/files/{path}` | Create or update file |
| DELETE | `/api/skills/{name}/files/{path}` | Delete file |
| POST | `/api/skills/{name}/files/{path}/rename` | Rename file |
| DELETE | `/api/skills/{name}/folders/{path}` | Delete folder |

### Create Skill Request

```json
{
  "name": "my-skill",
  "description": "What this skill does",
  "template": "script",
  "license": "MIT",
  "metadata": {
    "author": "your-name",
    "version": "1.0"
  }
}
```

**Templates:** `blank`, `script`, `instruction`, `mcp`

## Blob Storage Layout

Single container, tenant-isolated virtual directories:

```
skills-container/
├── {tenant-id}/
│   ├── crm-opportunity/
│   │   ├── SKILL.md
│   │   ├── scripts/
│   │   ├── references/
│   │   └── assets/
│   └── data-processor/
│       └── ...
└── {another-tenant-id}/
    └── ...
```

All users in the same Azure AD tenant share the same skills namespace.

## Install Token System

For CLI-based skill installation (e.g., `claude skill add --url <tar_url>`):

1. Authenticated user calls `POST /api/skills/{name}/install-token`
2. Server generates a single-use token (300s TTL), stored in memory
3. Returns `tar_url` with token and `sas_urls` for direct Blob access
4. CLI downloads tar.gz via `GET /api/skills/{name}/tar?token=` — no Bearer token needed
5. Token is consumed on first use

## Limits

| Limit | Value |
|-------|-------|
| ZIP import max size | 10 MB |
| Single file max size | 1 MB |
| Max files per skill | 100 |
| Reserved skill names | `import`, `new`, `search` |
| Install token TTL | 300 seconds, single use |

## Testing

```bash
pip install -r requirements-dev.txt
pytest tests/ -v
pytest tests/ --cov=app --cov-report=term-missing
```

## Development

```bash
# Backend with auto-reload
uvicorn app.core.main:app --reload --port 8000

# Frontend dev server (Vite) proxies /api → localhost:8000
```
