# Admin plane is a build-and-deploy pipeline; `integrations/` stays for hand-coded deployables

At the time `carvychen/crm-agent` was merged into this monorepo, `integrations/crm-agent/` did two jobs under one roof: it hosted an **MCP server** (Dataverse OBO, OData queries, RLS-aware list/get/create) and a **reference agent** (prompt + LLM + tool-call loop at `/api/chat`). The `CONTEXT-MAP.md` described this as the runtime side of the platform, opposite the admin plane's pure CRUD. The temptation to collapse the boundary — "runtimes are small, the admin plane is growing, just merge them" — kept coming up.

We deliberately chose **not** to merge. But more importantly, the reasoning shifted during the MCP Hub design discussion (PRD #14): the admin plane isn't staying pure CRUD. Its terminal form is an authoring IDE + build pipeline + deploy pipeline + service registry — the kind of thing a PaaS does. That changes what `integrations/` is *for*, and pre-commits the data model shape of every Hub we build.

## Considered options

- **Merge `integrations/crm-agent/` into `backend/app/`** — fewer top-level directories, one deployment, one dependency graph. **Rejected because**: a Function App is its own release artifact with its own customers (end-users + their agents, not platform admins), its own deploy cadence, its own secrets vault, its own CI pipeline. Welding it to the admin FastAPI forces lockstep releases between two things that should evolve independently, and confuses the security model (admin uses Entra roles scoped to the platform tenant; the integration uses OBO against a customer's Dataverse).
- **Keep `integrations/` as an open-ended home for any domain-specific runtime code** — accept that the directory will accumulate over time as the business grows. **Rejected because**: this is the trajectory that leads to every backend being one-off hand-coded, and the platform's value (authoring once, deploying many) never arriving. If `integrations/` can grow unboundedly, there's no pressure on the generator to improve.
- **Delete `integrations/` once a generator exists** — if the admin plane can produce MCP servers and agents, eventually the hand-coded ones become legacy. **Rejected because**: some integrations are too domain-specific for a generator to cover coherently (the CRM OBO flow, with its tenant-configured Dataverse endpoint + RLS bypass rules, is one example). A generator that tries to handle everything becomes a configuration nightmare; keeping a narrow generator + a small hand-coded escape hatch is strictly better.

## Decision

### The admin plane is a build-and-deploy pipeline, not pure CRUD

Every Hub (`skills/`, `mcps/`, `prompts/`, `agents/`) has up to two modes:

1. **External registration** — user supplies metadata pointing at something that already exists (a URL, a binary, a prompt-set hosted elsewhere). MCP Hub's first slice (PRD [#14](https://github.com/carvychen/agent-platform/issues/14), issue [#15](https://github.com/carvychen/agent-platform/issues/15)) implements exactly this. `source: external` in the metadata doc.
2. **Platform-authored** — user authors content in the admin plane's editors (Monaco-style), hits "deploy", and the admin plane *generates* the runtime code, builds it, and deploys it as an Azure Function App in the tenant's subscription, returning the endpoint URL. `source: platform_authored` in the metadata doc. Future slices — MCP-2 (one-click MCP deploy), Agent-2 (one-click agent deploy + playground).

Every Hub's data model carries `source` from day one so the schema never needs a migration when mode #2 lands. (PRD #14 explicitly bakes this in — `source` is a Literal union, today rejecting `platform_authored` with 422 as forward-compat.)

The Agent Hub's terminal form (PRD-still-to-be-written, likely late this year) composes over the other Hubs: an agent binds to already-registered skills / MCPs / prompts by reference, and the deploy pipeline generates its `/api/chat` runtime.

### `integrations/` exists for hand-coded deployables only

Two legitimate reasons for a directory under `integrations/`:

1. **Legacy** — code that predates the build pipeline. `integrations/crm-agent/` is the canonical example: it was written as a standalone repo, got absorbed via `git filter-repo`, and now lives here with its history intact.
2. **Too bespoke for the generator** — domain code that can't be expressed as "pick these tools + paste this prompt + deploy" without an ugly pile of escape hatches. CRM's OBO flow with per-tenant Dataverse URLs and OData-shaped queries might stay here even after Agent Hub's deploy pipeline exists, because generating it would require more platform knobs than hand-coding it.

Specifically: generated deployables from mode #2 do **not** land in `integrations/`. They live in the tenant's Azure subscription as Function Apps, with source only in the Hub's metadata (the prompt, the tool functions, the binding list) — not in Git. That's the point: the source of truth for a platform-authored agent is the Hub, not a repo.

### The crm-agent integration's long-term shape

`integrations/crm-agent/` currently has both halves (MCP + reference agent at `/api/chat`). When Agent Hub's deploy pipeline exists:

- The **MCP half** stays. It's domain-specific enough that expressing it as "generate an MCP server from these tool functions" either (a) doesn't fit the generator cleanly, or (b) if it does, becomes a good test case that Agent Hub's binding model works against a real MCP. Either way, the MCP server stays as hand-coded reference code.
- The **`/api/chat` half** becomes redundant. It exists today because no Agent Hub runtime exists. Once the platform can take an agent definition + deploy it, the reference `/api/chat` is superseded and can be dropped.

So the crm-agent integration naturally shrinks from "reference runtime" to "hand-coded MCP server for Dynamics 365". That's the correct terminal state.

### Decision rules for future slices

1. **Hub data model**: every Hub carries `source` (or equivalent discriminator) from its first real CRUD slice, with a Literal union pre-seeding the platform-authored value even when only `external` is accepted. No schema migrations between "external CRUD" and "platform-authored + deploy" slices.
2. **Deploy pipeline ownership**: the build + deploy pipeline lives under `backend/app/` (new `deployment/` module when the first slice lands), not inside any individual Hub. It's shared infrastructure.
3. **New `integrations/<name>/`**: only accepted when no viable generator path exists. Adding one is a signal that the generator needs extending or that the domain is genuinely outside the pattern. Reviewers should push back on "just add another integration" when the thing being added could plausibly be generated.
4. **Each integration keeps its own ADRs + tests**: `integrations/<name>/docs/adr/` stays authoritative for that integration's local decisions. Root `docs/adr/` is for decisions that span both planes (auth contract, this ADR, any future ones that shape Hub behavior or the build pipeline).

## Consequences

- **Slice planning has two PRD families per Hub.** "CRUD" (metadata-only) and "one-click deploy" (authoring + generating + deploying). MCP-1 (PRD #14) is the first. Each CRUD PRD is relatively small; each deploy PRD is load-bearing architectural work.
- **MCP-2's design will set a template.** It's the first time we build the deploy pipeline. Once that exists, Agent-2 mostly reuses the pattern — so the MCP-2 PRD deserves more design rigour than subsequent deploy PRDs.
- **`integrations/` center of gravity is bounded by design.** It starts with crm-agent and grows only when something genuinely can't be generated. The admin plane's `backend/app/` is the directory that grows with the business.
- **Cross-cutting ADRs stay load-bearing.** This document is the "why the structure is what it is" anchor. When somebody in 2027 wonders why `integrations/` is still there after Agent Hub deploy shipped, they read this.
- **Role vocabulary rename (`SkillAdmin` → `PlatformAdmin` etc.) is a separate concern.** The legacy name persists across every Hub and across this ADR for now. Renaming is cross-Hub refactor scope and unrelated to the build-pipeline decision.
- **No rush to rename `/api/chat`.** It stays as-is until Agent Hub deploy exists; then `integrations/crm-agent/` gets pruned to the MCP half and `/api/chat` goes.

## Source

- Architectural discussion during PRD [carvychen/agent-platform#14](https://github.com/carvychen/agent-platform/issues/14) (MCP Hub CRUD) and the preceding session where the user clarified the end-state vision (authoring + one-click deploy for both MCP and Agent Hubs, plus playground).
- Supersedes the implicit "admin plane = CRUD forever, runtimes = self-contained forever" model described in the original [`CONTEXT-MAP.md`](../../CONTEXT-MAP.md). `CONTEXT-MAP.md` is left as-is because its current description is accurate for today's state; this ADR is the forward-looking commitment.
