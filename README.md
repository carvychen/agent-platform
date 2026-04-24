# Agent Platform

Monorepo containing two independently-deployable halves:

- **Admin plane** (`backend/` + `frontend/`) — a FastAPI + React service where tenants author, edit, version, and install content (skill bundles, MCP server definitions, prompt sets, agent definitions) that external integrations consume. Multi-tenant via Azure AD; tenant isolation by blob-path prefix.
- **Runtimes** (`integrations/`) — production-grade Azure Functions deployments that serve the MCP Streamable HTTP transport and reference agents. Self-contained — each ships its own content and has zero dependency on the admin plane at runtime. Today there is one: `integrations/crm-agent/`, a reference implementation for Lenovo Dynamics 365 opportunities.

See [`CONTEXT-MAP.md`](./CONTEXT-MAP.md) for the boundary between these two contexts and which per-context glossary applies to your task.

## Documentation map

| You want to... | Read |
|---|---|
| Understand the monorepo's two halves | [`CONTEXT-MAP.md`](./CONTEXT-MAP.md) |
| Work on the admin plane's backend | [`backend/README.md`](./backend/README.md) + [`backend/app/CONTEXT.md`](./backend/app/CONTEXT.md) |
| Work on the admin plane's frontend | [`frontend/README.md`](./frontend/README.md) |
| Work on the CRM runtime | [`integrations/crm-agent/README.md`](./integrations/crm-agent/README.md) + [`integrations/crm-agent/docs/CONTEXT.md`](./integrations/crm-agent/docs/CONTEXT.md) |
| Understand a cross-cutting architectural decision | [`docs/adr/`](./docs/adr/) |
| Understand a integration-specific architectural decision | [`integrations/crm-agent/docs/adr/`](./integrations/crm-agent/docs/adr/) |
| Follow the project's coding standards | [`CLAUDE.md`](./CLAUDE.md) |
| Browse design discussions + wiki | [`wiki/`](./wiki/) (or the [GitHub Wiki](https://github.com/carvychen/agent-platform/wiki)) |

## Layout

```
.
├── backend/                 # admin-plane FastAPI (Python 3.11)
│   ├── README.md
│   ├── requirements.txt
│   ├── .python-version
│   └── app/
│       ├── core/            main.py, config.py, auth/, coming_soon.py
│       ├── skills/          Skill Hub (real CRUD)
│       ├── mcps/            MCP Hub (501 stub)
│       ├── prompts/         Prompt Hub (501 stub)
│       ├── agents/          Agent Hub (501 stub)
│       └── CONTEXT.md       admin-plane glossary
├── frontend/                # admin-plane React SPA (Vite + React 19)
├── integrations/
│   └── crm-agent/           # reference runtime — Azure Functions, MCP + agent
│       ├── README.md
│       ├── src/             mcp_server.py, agent/, auth.py, config.py, ...
│       ├── skills/crm-opportunity/   skill bundle for CRM
│       ├── infra/           Bicep
│       ├── tests/
│       └── docs/
│           ├── CONTEXT.md   runtime glossary
│           └── adr/         integration-specific ADRs (0001–0008)
├── docs/
│   └── adr/                 cross-cutting ADRs (starts with 0001 auth contract)
├── wiki/                    GitHub Wiki source
├── CONTEXT-MAP.md
├── CLAUDE.md
└── README.md                (this file)
```

## Quick start

Pick a deployable to work on — they are independent. You do not need to run both to work on one.

### Admin plane backend

```bash
cd backend
python -m venv .venv         # or mamba / pyenv equivalent; Python 3.11
source .venv/bin/activate
pip install -r requirements-dev.txt
cp .env.example .env         # edit with your Azure values
uvicorn app.core.main:app --reload --port 8000
```

See [`backend/README.md`](./backend/README.md) for the full setup, env vars, and API reference.

### Admin plane frontend

```bash
cd frontend
npm install
cp .env.example .env
npm run dev                  # Vite on :5173, proxies /api → :8000
```

See [`frontend/README.md`](./frontend/README.md).

### CRM runtime

```bash
cd integrations/crm-agent
mamba create --prefix ./.venv python=3.11 -y
.venv/bin/pip install -r requirements-dev.txt
.venv/bin/pytest             # 113 unit tests, no Azure resources required
```

Deployment and OBO / Dataverse setup are extensive — see the runtime's own guides:
- [`integrations/crm-agent/docs/deployment/`](./integrations/crm-agent/docs/deployment/)
- [`integrations/crm-agent/docs/operations/troubleshooting.md`](./integrations/crm-agent/docs/operations/troubleshooting.md)

## Project invariants (apply to both contexts)

1. **Admin plane is CRUD only.** No runtime endpoints (`/mcp`, `/api/chat`, etc.) live in `backend/app/`. Runtimes serve those.
2. **Runtimes are self-contained.** No runtime calls the admin plane at startup or at request time. Content that *could* be authored in the admin plane today ships baked-in for the reference runtime.
3. **Admin and integrations share nothing in the Python layer.** Each has its own auth, config, utility code. The contract for inbound Azure AD token validation is documented in [`docs/adr/0001-auth-contract-admin-vs-runtime.md`](./docs/adr/0001-auth-contract-admin-vs-runtime.md).
4. **Per-context ADRs stay in their context.** Cross-cutting decisions in root `docs/adr/`; integration-specific decisions in `integrations/<name>/docs/adr/`.

## History note

This repository was formed on 2026-04-24 by merging `carvychen/crm-agent` into `carvychen/agent-platform` via `git filter-repo --to-subdirectory-filter integrations/crm-agent`. All 45 commits from `crm-agent` are preserved under their new paths — `git log --follow -- integrations/crm-agent/<path>` walks the original history, and `git blame` points at the real PR authors. The PRD that drove the merge is [carvychen/agent-platform#1](https://github.com/carvychen/agent-platform/issues/1); the design decisions are captured in [`integrations/crm-agent/docs/planning/monorepo-integration.md`](./integrations/crm-agent/docs/planning/monorepo-integration.md).
