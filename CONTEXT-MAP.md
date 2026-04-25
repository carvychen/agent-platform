# Context Map

This monorepo has two contexts with largely disjoint vocabularies. Read the one relevant to your current task.

## `platform-admin` — the admin plane

**Lives in**: `backend/` + `frontend/`

**What it is**: a FastAPI + React service where tenants author, edit, version, and install *content* that external integrations consume. Currently exposes a real **Skill Hub** with CRUD over skill bundles in Azure Blob Storage; **MCP Hub**, **Prompt Hub**, **Agent Hub** exist as 501 Coming Soon stubs today (real CRUD lands in future slices).

The admin plane is **pure CRUD over artifacts**. It does not execute agents, serve MCP tool calls, or call LLMs.

**Glossary**: [`backend/app/CONTEXT.md`](./backend/app/CONTEXT.md)

## `crm-agent-integration` — the CRM MCP-server + reference agent

**Lives in**: `integrations/crm-agent/`

**What it is**: a production-grade Azure Functions deployment that does two things:

1. **An MCP server** at `/mcp/*` — domain-specific code implementing Dynamics 365 tool calls (OBO to Dataverse, OData queries, RLS-aware list/get/create operations). This half is not generic — every backend system that wants to expose tools via MCP needs its own deployable like this.
2. **A reference agent** at `/api/chat` — prompt + LLM + tool-call loop. This half wires the MCP server into a callable HTTP endpoint using the same pattern (prompt + tool calls + LLM loop) any agent running against this MCP server would follow.

Self-contained — ships its own skill bundle, prompts, MCP tools, and agent wiring. Has **zero dependency** on the admin plane at runtime. This is a hand-coded integration that runs independently of the admin plane, per [ADR 0002](./docs/adr/0002-admin-plane-as-build-and-deploy-pipeline.md).

Archival note: this directory was migrated from the standalone `carvychen/crm-agent` repository on 2026-04-24 via `git filter-repo --to-subdirectory-filter integrations/crm-agent` with full history preserved.

**Glossary**: [`integrations/crm-agent/docs/CONTEXT.md`](./integrations/crm-agent/docs/CONTEXT.md)

## Architectural invariants (both contexts)

- **Admin plane and integrations communicate through documented contracts only.** Nothing in `backend/app/` imports from `integrations/`, and nothing in `integrations/` imports from `backend/app/`.
- **No shared Python package.** Each side owns its own auth, config, and utility code. The contract (both validate inbound Azure AD JWTs independently per Entra JWKS; each extracts `oid` / `tid` / `upn` / `roles` from verified claims) is documented in [`docs/adr/0001-auth-contract-admin-vs-runtime.md`](./docs/adr/0001-auth-contract-admin-vs-runtime.md).
- **Per-context ADRs stay in their context.** Root `docs/adr/` holds only cross-cutting decisions. `integrations/crm-agent/docs/adr/` holds integration-specific ADRs (0001–0008, migrated intact).

## Forward-looking shape (not yet implemented)

This map describes today's state — a pure-CRUD admin plane and self-contained integrations. The commitment documented in [`docs/adr/0002-admin-plane-as-build-and-deploy-pipeline.md`](./docs/adr/0002-admin-plane-as-build-and-deploy-pipeline.md) is that the admin plane evolves into an **authoring + build + deploy pipeline**: each Hub gets a second mode where users write content in the editor, hit "deploy", and the platform generates + deploys a Function App in the tenant's subscription. `integrations/` is narrow — reserved for hand-coded deployables that the generator can't cover. When reasoning about Hub or `integrations/` scope in new work, read that ADR.

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
├── integrations/      # domain-specific MCP-server deployables (+ optional reference agent)
│   └── crm-agent/     # Dynamics 365 integration (crm-agent-integration context)
├── docs/
│   └── adr/          # cross-cutting ADRs only
├── wiki/             # GitHub Wiki source
├── CONTEXT-MAP.md    # this file
├── CLAUDE.md         # project-wide coding guidelines
└── README.md         # repo-level entry point
```
