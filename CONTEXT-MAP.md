# Context Map

This monorepo has two contexts with largely disjoint vocabularies. Read the one relevant to your current task.

## `platform-admin` — the admin plane

**Lives in**: `backend/` + `frontend/`

**What it is**: a FastAPI + React service where tenants author, edit, version, and install *content* that external runtimes consume. Currently exposes a real **Skill Hub** with CRUD over skill bundles in Azure Blob Storage; **MCP Hub**, **Prompt Hub**, **Agent Hub** exist as 501 Coming Soon stubs today (real CRUD lands in future slices).

The admin plane is **pure CRUD over artifacts**. It does not execute agents, serve MCP tool calls, or call LLMs.

**Glossary**: [`backend/app/CONTEXT.md`](./backend/app/CONTEXT.md)

## `crm-agent-runtime` — the reference runtime

**Lives in**: `runtimes/crm-agent/`

**What it is**: a production-grade Azure Functions deployment that serves the MCP Streamable HTTP transport (`/mcp/*`) and a reference agent (`/api/chat`) against Lenovo's Dynamics 365 opportunities. Self-contained — ships its own skill bundle, prompts, MCP tools, and agent wiring. Has **zero dependency** on the admin plane at runtime.

Archival note: this directory was migrated from the standalone `carvychen/crm-agent` repository on 2026-04-24 via `git filter-repo --to-subdirectory-filter runtimes/crm-agent` with full history preserved.

**Glossary**: [`runtimes/crm-agent/docs/CONTEXT.md`](./runtimes/crm-agent/docs/CONTEXT.md)

## Architectural invariants (both contexts)

- **Admin plane and runtimes communicate through documented contracts only.** Nothing in `backend/app/` imports from `runtimes/`, and nothing in `runtimes/` imports from `backend/app/`.
- **No shared Python package.** Each side owns its own auth, config, and utility code. The contract (both validate inbound Azure AD JWTs independently per Entra JWKS; each extracts `oid` / `tid` / `upn` / `roles` from verified claims) is documented in [`docs/adr/0001-auth-contract-admin-vs-runtime.md`](./docs/adr/0001-auth-contract-admin-vs-runtime.md).
- **Per-context ADRs stay in their context.** Root `docs/adr/` holds only cross-cutting decisions. `runtimes/crm-agent/docs/adr/` holds runtime-specific ADRs (0001–0008, migrated intact).

## Top-level layout

```
.
├── backend/          # admin-plane FastAPI (platform-admin context)
│   └── app/
│       ├── core/       main.py, config.py, auth/
│       ├── skills/     Skill Hub
│       ├── mcps/       MCP Hub (501 stub)
│       ├── prompts/    Prompt Hub (501 stub)
│       └── agents/     Agent Hub (501 stub)
├── frontend/         # admin-plane React SPA (platform-admin context)
├── runtimes/
│   └── crm-agent/    # reference runtime (crm-agent-runtime context)
├── docs/
│   └── adr/          # cross-cutting ADRs only
├── wiki/             # GitHub Wiki source
├── CONTEXT-MAP.md    # this file
├── CLAUDE.md         # project-wide coding guidelines
└── README.md         # repo-level entry point
```
