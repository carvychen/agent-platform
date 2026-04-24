# Agent Platform — Admin Backend

FastAPI backend for the Agent Platform **admin plane** — CRUD over the content tenants author (skill bundles, MCP server definitions, prompt sets, agent definitions) that external integrations consume. See [`../CONTEXT-MAP.md`](../CONTEXT-MAP.md) and [`app/CONTEXT.md`](./app/CONTEXT.md) for terminology, and [`../README.md`](../README.md) for the monorepo overview.

Artifacts live in Azure Blob Storage with **tenant-level isolation** via the Azure AD `tid` claim. All endpoints are secured via Azure AD (Entra ID) JWT authentication with **App Roles RBAC** (`SkillAdmin` / `SkillUser`).

This service is the admin plane — pure CRUD. Runtime endpoints (`/mcp/*`, `/api/chat`) live in `integrations/` and do not depend on this backend at startup or request time.

## Hub status

| Hub | Status | Location |
|---|---|---|
| Skill Hub | **Real CRUD** — 14 endpoints for list / get / create / update / delete / import / export / install-token / validate | `app/skills/` |
| MCP Hub | **Real CRUD (partial)** — list + create for external registrations; detail / edit / delete / `.mcp.json` snippet in follow-up slices | `app/mcps/` |
| Prompt Hub | 501 Coming Soon stub | `app/prompts/` |
| Agent Hub | 501 Coming Soon stub | `app/agents/` |

Stub hubs return the documented contract from [`app/core/coming_soon.py`](./app/core/coming_soon.py). Real CRUD for the remaining stubs is tracked under PRD [carvychen/agent-platform#1](https://github.com/carvychen/agent-platform/issues/1); MCP Hub's remaining slices live under PRD [#14](https://github.com/carvychen/agent-platform/issues/14) (issues [#16](https://github.com/carvychen/agent-platform/issues/16), [#17](https://github.com/carvychen/agent-platform/issues/17)).

## Module layout (vertical slicing)

```
app/
├── core/              # shared plumbing — do not import hub-specific code here
│   ├── main.py        #   FastAPI app factory; mounts all hub routers
│   ├── config.py      #   pydantic-settings
│   ├── auth/          #   JWT validation + RBAC dependencies
│   └── coming_soon.py #   501 factory for stub hubs
├── skills/            # Skill Hub — router + service + install_token + validator + models
├── mcps/              # MCP Hub — router + McpService (domain) + models; stores JSON via BlobStorageService
├── prompts/           # Prompt Hub stub
├── agents/            # Agent Hub stub
└── CONTEXT.md         # admin-plane glossary
```

Each hub owns its own router, service, models, and tests. Cross-hub code goes in `core/`. New hubs follow the same pattern — add a sibling folder, wire its router in `core/main.py`.

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
