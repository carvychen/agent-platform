# Auth contract — admin and runtime validate JWTs independently

The monorepo hosts two independently-deployable artifacts: the admin plane (`backend/`, FastAPI CRUD over Blob-stored content) and one or more runtimes (`runtimes/<name>/`, Azure Functions serving MCP + agent endpoints). Both validate inbound Azure AD access tokens, both extract the same claim shape (`oid` / `tid` / `upn` / `roles`), and both eventually implement nearly the same JWKS-fetch + signature-verify flow. A shared `packages/auth/` would eliminate that duplication.

We deliberately choose **not** to share. Each side owns its own JWT validation code. The contract is documented — this file — rather than encoded in a shared module.

## Considered options

- **Shared Python package at repo root (`packages/auth/` or similar)** — DRY. A single source of truth for JWKS fetching, signature verification, claim extraction, cache invalidation. Every improvement propagates to both sides in one PR. **Rejected because**: it couples the admin plane and runtimes into a single dependency graph. A change that is safe on one side can break the other; any bump requires lockstep testing; a runtime that wants a newer / older version of the shared code has to negotiate. The whole point of the admin-vs-runtime split (see `CONTEXT-MAP.md`) is that they evolve on independent release cycles.
- **Git submodule or sub-tree vendoring** — similar to shared package but via git plumbing. Same coupling downside, plus worse ergonomics for contributors.
- **Monkey-patch / dynamic injection at process startup** — avoided; fragile, hard to reason about, worse than the shared-package option in every way.

## Decision

**No shared Python package** between the admin plane and runtimes. Each deployable owns its own auth code. The **contract** — what every side must do, and what claim shape every side produces — is this ADR.

### What every inbound-JWT validator in this monorepo MUST do

1. Fetch the Azure AD signing keys from the **JWKS** endpoint for the tenant named by `CLOUD_ENV` (Global or China authority). Cache in-process with a bounded invalidation window so key rotation does not require restart.
2. Verify the token's signature against the JWKS using **RS256**.
3. Verify the token's `iss` claim matches the expected Entra issuer for the configured tenant.
4. Verify the token's `aud` claim matches the configured Application ID URI (today this is bypassed on the admin plane per roadmap item A.1; fixing that is a known follow-up and does not alter this contract).
5. Verify `exp` (not expired) and `nbf` (not before) claims.
6. Return a typed `UserInfo`-equivalent containing, at minimum: `oid`, `tid`, `upn` (or `preferred_username`), and `roles`.

Failures at any step produce `HTTP 401 Unauthorized`. The **body** of the 401 is implementation-specific — the admin plane currently returns a JSON `{"detail": "..."}` via FastAPI's exception handler; runtimes may return their own shape. Clients handle 401 generically.

### What every deployable MUST NOT do

- Call directly into another deployable's auth code. If `runtimes/crm-agent/`'s `src/auth.py` starts importing from `backend/app/core/auth/`, the boundary is broken.
- Assume a shared role vocabulary. The admin plane uses `SkillAdmin` / `SkillUser`; runtimes may use entirely different roles or none. Role names are tenant-configured in Azure AD; each side resolves its own.

## Consequences

- **Duplication is acceptable, even encouraged.** Two 100-line JWT validators that do the same thing are a feature, not a bug — they let the admin plane upgrade Entra libraries on its own cadence while runtimes stay pinned.
- **Drift is a real risk.** If one side fixes a JWKS-cache bug and the other doesn't, authentication behavior subtly diverges. Mitigation: when touching auth code on one side, grep the monorepo for parallel code on the other side and file a follow-up issue linking the two. PR reviewers can spot this.
- **A shared *documented* contract is load-bearing.** This ADR is that document. When the contract evolves (new required claim, new cloud tenant, new algorithm), update this ADR first, then update every implementation. Changes here are cross-cutting and get a PR label to that effect.
- **New runtimes inherit the contract for free.** When `runtimes/hr-agent/` or similar appears, its implementer reads this ADR and writes its own JWT validator matching the contract. No coordination with the admin plane is needed beyond reading this file.

## Source

PRD [carvychen/agent-platform#1](https://github.com/carvychen/agent-platform/issues/1) decision 10. Landed with Slice 4 (PR closing issue #5).
