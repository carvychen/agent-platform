# Skills Platform — Implementation Plan (v2)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Harden, fix, and enhance the existing Skills module of the Agent Platform. The MVP is complete and functional — this plan covers security fixes, bug fixes, engineering improvements, and feature enhancements to bring it to production quality.

**Architecture:** React 18 SPA + FastAPI backend, Azure Blob Storage (DefaultAzureCredential), Azure AD / Entra ID authentication with App Roles RBAC, tenant-level isolation via `tid` claim.

**Tech Stack:** React 18 + TypeScript + Vite, Tailwind CSS 4 + Lucide Icons, Monaco Editor, React Router v7, TanStack React Query + Axios, React Hook Form + Zod, Python FastAPI, azure-storage-blob SDK, MSAL.js, react-markdown + remark-gfm + react-syntax-highlighter.

**Spec Reference:** See `docs/superpowers/specs/2026-04-14-skills-platform-design.md`

**Verification:** Every UI change requires Playwright browser verification (snapshot or screenshot) before marking complete. No mocking in tests — all tests run against real services.

---

## Current File Structure

### Backend (`backend/`)

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                    # FastAPI app, CORS, router, /api/health, /api/me
│   ├── config.py                  # Settings (blob, Azure AD, CORS)
│   ├── auth/
│   │   ├── __init__.py
│   │   └── dependencies.py        # JWT verification, UserInfo, RBAC dependencies
│   ├── routers/
│   │   ├── __init__.py
│   │   └── skills.py              # 13+ endpoints, templates, ZIP import/export
│   ├── services/
│   │   ├── __init__.py
│   │   ├── blob_storage.py        # BlobStorageService (CRUD, SAS, parallel ops)
│   │   ├── skill_validator.py     # agentskills.io naming and frontmatter validation
│   │   └── install_token.py       # In-memory install token store
│   └── models/
│       ├── __init__.py
│       └── skill.py               # Pydantic models (Create, FileWrite, FileRename)
├── tests/
│   ├── __init__.py
│   ├── conftest.py
│   ├── test_auth.py
│   ├── test_skill_validator.py
│   └── test_blob_storage.py
├── requirements.txt
├── requirements-dev.txt
└── .env.example
```

### Frontend (`frontend/`)

```
frontend/
├── src/
│   ├── main.tsx
│   ├── App.tsx                            # Router + Auth + QueryClient
│   ├── index.css                          # Tailwind theme (custom palette + fonts)
│   ├── auth/
│   │   ├── msalConfig.ts                  # MSAL configuration
│   │   ├── AuthProvider.tsx               # MSAL init + ready gate
│   │   ├── useAuth.ts                     # login/logout/getAccessToken hook
│   │   └── useRoles.ts                    # RBAC hook (isAdmin, canRead, canWrite)
│   ├── api/
│   │   ├── axiosClient.ts                 # Axios + token cache + request dedup
│   │   └── skillsApi.ts                   # 15 API functions
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx
│   │   │   ├── TopBar.tsx
│   │   │   └── AppLayout.tsx
│   │   ├── skills/
│   │   │   ├── SkillCard.tsx
│   │   │   ├── TemplateCard.tsx
│   │   │   ├── FileTree.tsx               # File tree + context menu + inline edit
│   │   │   ├── SkillMetadataPills.tsx
│   │   │   ├── MarkdownRenderer.tsx
│   │   │   ├── InstallGuide.tsx           # Multi-agent install guide
│   │   │   ├── ExportDropdown.tsx         # Export dropdown
│   │   │   └── ImportSkillDialog.tsx      # Import dialog
│   │   └── ui/
│   │       ├── SearchInput.tsx
│   │       ├── Breadcrumb.tsx
│   │       ├── EmptyState.tsx
│   │       └── SplitButton.tsx
│   ├── pages/
│   │   └── skills/
│   │       ├── SkillListPage.tsx
│   │       ├── SkillCreatePage.tsx
│   │       ├── SkillEditorPage.tsx
│   │       └── SkillDetailPage.tsx
│   ├── hooks/
│   │   ├── useSkills.ts                   # React Query hooks (list/detail/create/delete/validate/import)
│   │   └── useSkillFiles.ts               # React Query hooks (file CRUD with optimistic updates)
│   ├── types/
│   │   └── skill.ts                       # TypeScript type definitions
│   ├── constants/
│   │   └── agents.ts                      # 6 supported Agent definitions
│   └── utils/
│       └── zipAssembler.ts                # Browser-side ZIP assembly
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── .env.example
```

---

## Phase A: Security Hardening (Critical — Do First)

**Priority:** These are security vulnerabilities that must be fixed before any production deployment.

### A.1 — Fix JWT audience verification

`backend/app/auth/dependencies.py`

- [ ] Remove `"verify_aud": False` from the `jwt.decode()` options dict in `get_current_user()`
- [ ] Pass `audience=[settings.azure_ad_audience, settings.azure_ad_client_id]` to `jwt.decode()`
- [ ] Remove the manual `if aud not in (...)` string comparison that follows
- [ ] Test: verify valid tokens pass, tokens with wrong audience are rejected 401

### A.2 — Add path traversal protection

`backend/app/services/blob_storage.py`

- [ ] In `_blob_path()` method, add `posixpath.normpath()` normalization
- [ ] Reject any path that contains `..` after normalization
- [ ] Raise `ValueError` (caught as 400 in router) for invalid paths
- [ ] Apply the same check to `skill_name` parameter in all public methods
- [ ] Test: verify `../../etc/passwd` style paths are blocked

### A.3 — Fix XSS in Markdown renderer

`frontend/src/components/skills/MarkdownRenderer.tsx`

- [ ] Remove `rehype-raw` plugin
- [ ] Add `rehype-sanitize` dependency: `npm install rehype-sanitize`
- [ ] Add `rehypeSanitize` to the rehype plugins list in `react-markdown`
- [ ] Playwright verify: render a SKILL.md with `<script>alert('xss')</script>` — must be stripped

### A.4 — Add JWKS cache TTL

`backend/app/auth/dependencies.py`

- [ ] Add timestamp tracking to the JWKS cache variable
- [ ] Set TTL to 24 hours (86400 seconds)
- [ ] On cache miss (kid not found), force refresh before returning 401
- [ ] On TTL expiry, clear cache so next request fetches fresh keys
- [ ] Test: verify key rotation scenario works (old kid triggers refresh)

### A.5 — Add content size limit to FileWriteRequest

`backend/app/models/skill.py`

- [ ] Add `max_length=1_048_576` (1 MB) to `FileWriteRequest.content` field
- [ ] This enforces at Pydantic validation level, returns 422 for oversized content
- [ ] Test: verify 1 MB content passes, 1 MB + 1 byte is rejected

### A.6 — Tighten CORS configuration

`backend/app/main.py`

- [ ] Change `allow_methods=["*"]` to `allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"]`
- [ ] Change `allow_headers=["*"]` to `allow_headers=["Authorization", "Content-Type", "Accept"]`
- [ ] Keep `allow_origins` reading from config (already correct)
- [ ] Test: verify preflight OPTIONS returns correct restricted headers

### A.7 — Enforce reserved skill name check

`backend/app/routers/skills.py`

- [ ] In `create_skill()` (POST ``): add check `if req.name in RESERVED_SKILL_NAMES: raise HTTPException(422)`
- [ ] In `import_skill()` (POST `/import`): add same check after extracting `skill_name` from ZIP
- [ ] `RESERVED_SKILL_NAMES = {"import", "new", "search"}` is already defined at module level
- [ ] Test: verify creating a skill named "import" returns 422

---

## Phase B: Bug Fixes

**Priority:** Fix known bugs that affect correctness of existing features.

### B.1 — Fix empty file save prevention

`frontend/src/pages/skills/SkillEditorPage.tsx`

- [ ] Find the save handler (around line 106) — `!editorContent` check
- [ ] Change condition to `editorContent === undefined || editorContent === null` (allow empty string `""`)
- [ ] Users should be able to save a file with empty content
- [ ] Playwright verify: open a file, clear all content, Cmd+S — should save successfully

### B.2 — Fix React Query refetch overwriting unsaved editor content

`frontend/src/pages/skills/SkillEditorPage.tsx`

- [ ] Around lines 98-103, React Query's automatic refetch replaces editor content
- [ ] Track "dirty" state: set a `isDirty` ref when user edits, clear it on successful save
- [ ] Skip updating Monaco editor content from query data when `isDirty` is true
- [ ] Use `enabled: false` or `refetchOnWindowFocus: false` for the file content query while editing
- [ ] Playwright verify: edit a file, wait for staleTime to pass, verify edits are preserved

### B.3 — Fix FileTree rename-on-Escape bug

`frontend/src/components/skills/FileTree.tsx`

- [ ] Around lines 192-201: pressing Escape to cancel rename triggers `onBlur` which submits
- [ ] Add an `isCancelled` ref — set to `true` on Escape keydown
- [ ] In the `onBlur` handler, check `isCancelled` ref — if true, restore original name without submitting
- [ ] Reset `isCancelled` ref when entering rename mode
- [ ] Playwright verify: enter rename mode, press Escape — name should revert, no API call made

### B.4 — Fix frontmatter stripping with `---` separators

`frontend/src/components/skills/MarkdownRenderer.tsx`

- [ ] Around lines 53-57: current regex/logic fails when SKILL.md body contains `---` (thematic break)
- [ ] Fix: match only the FIRST frontmatter block (between first `---` at line 0 and the next `---`)
- [ ] Use a regex like `/^---\n[\s\S]*?\n---\n/` (non-greedy, anchored to string start — do NOT use multiline flag)
- [ ] Playwright verify: render SKILL.md with a `---` separator in the body — should render correctly

### B.5 — Fix backend test files after tenant_id refactor

`backend/tests/test_auth.py`

- [ ] Update `UserInfo` construction to include `tenant_id` field
- [ ] Ensure all test assertions reflect tenant-level (not user-level) isolation
- [ ] Run tests: `cd backend && python -m pytest tests/test_auth.py -v`

### B.6 — Fix backend blob storage tests after _tenant_prefix rename

`backend/tests/test_blob_storage.py`

- [ ] Update references from `_user_prefix` to `_tenant_prefix`
- [ ] Update any test data or fixtures that reference old method names
- [ ] Run tests: `cd backend && python -m pytest tests/test_blob_storage.py -v`

### B.7 — Fix optimistic update hooks missing settlement invalidation

`frontend/src/hooks/useSkillFiles.ts`

- [ ] `useDeleteFile`: add `onSettled` callback that calls `queryClient.invalidateQueries({ queryKey: ["skills", skillName] })`
- [ ] `useRenameFile`: add same `onSettled` invalidation
- [ ] `useDeleteFolder`: add same `onSettled` invalidation
- [ ] This ensures cache is resynced with server state even when optimistic update succeeds
- [ ] Playwright verify: delete a file, verify file list updates correctly after server response

### B.8 — Fix silent auth failure in axiosClient

`frontend/src/api/axiosClient.ts`

- [ ] In `getAccessToken()` catch block (around line 39): `acquireTokenSilent` failure currently returns `null`
- [ ] When token is `null`, requests proceed without `Authorization` header → 401 from backend
- [ ] Add: attempt `acquireTokenRedirect` or `acquireTokenPopup` as fallback before returning null
- [ ] Alternatively: reject the Axios request in the interceptor when token is null (return `Promise.reject`)
- [ ] Playwright verify: simulate expired token scenario, verify user gets redirected to login

---

## Phase C: Engineering Improvements

**Priority:** Quality-of-life improvements that make the codebase more robust and maintainable.

### C.1 — Add ProtectedRoute wrapper

`frontend/src/components/auth/ProtectedRoute.tsx` (new file)

- [ ] Create a `ProtectedRoute` component that checks MSAL authentication state
- [ ] If not authenticated: redirect to login or show login prompt
- [ ] If authenticated but wrong role (e.g., SkillUser accessing /skills/new): redirect to /skills
- [ ] Wire into `App.tsx`: wrap all `/skills/*` routes with `<ProtectedRoute>`
- [ ] Playwright verify: access /skills without login — should redirect to login

### C.2 — Add "Coming Soon" placeholder pages

`frontend/src/pages/ComingSoonPage.tsx` (new file)

- [ ] Create a placeholder page component with icon, title, and "Coming Soon" message
- [ ] Add routes for `/agents`, `/prompts`, `/mcp-servers` pointing to this component
- [ ] Each route shows the relevant icon and module name
- [ ] Playwright verify: click "Agents" in sidebar — shows Coming Soon page, not blank

### C.3 — Improve blob storage list_skills performance

`backend/app/services/blob_storage.py`

- [ ] Current `list_skills()` makes N+1 queries (1 list + N reads for each SKILL.md)
- [ ] Optimize: use `list_blobs()` with `name_starts_with` prefix and parse results in one pass
- [ ] Extract metadata from blob properties where possible, lazy-load SKILL.md content only when needed
- [ ] Alternative: use `download_blob()` with `max_concurrency` for parallel SKILL.md reads
- [ ] Test: verify list_skills returns same results with improved performance

### C.4 — Add API error handling consistency

`backend/app/routers/skills.py`

- [ ] Audit all endpoints for consistent error response format: `{"detail": "message"}`
- [ ] Ensure all `HTTPException` use string `detail` (not dict) for consistency, except import conflict
- [ ] Add `ValueError` handler in router for path traversal errors from blob service (Phase A.2)
- [ ] Test: verify error responses are consistent across endpoints

### C.5 — Improve import error messages

`backend/app/routers/skills.py` — `_extract_and_validate_zip()`

- [ ] Add descriptive error for binary files skipped during import (currently silent `continue`)
- [ ] Return warnings alongside the import result (e.g., "3 binary files skipped")
- [ ] Show these warnings in the frontend `ImportSkillDialog`
- [ ] Playwright verify: import ZIP with a PNG file — shows warning about skipped binary

### C.6 — Add frontend error boundaries

`frontend/src/components/ErrorBoundary.tsx` (new file)

- [ ] Create React error boundary component with user-friendly error message
- [ ] Add retry button and "report issue" link
- [ ] Wrap page-level routes with error boundary in `App.tsx`
- [ ] Playwright verify: force an error in a component — error boundary catches and displays

### C.7 — Add loading and error states to all pages

`frontend/src/pages/skills/*.tsx`

- [ ] Audit each page for proper loading skeleton states
- [ ] Audit each page for proper error states (not just console errors)
- [ ] SkillListPage: loading skeleton cards, error state with retry
- [ ] SkillDetailPage: loading skeleton for header + content, error state
- [ ] SkillEditorPage: loading state for file tree and editor pane
- [ ] Playwright verify: each page shows appropriate loading state

---

## Phase D: Feature Enhancements

**Priority:** New features that improve the user experience. These are confirmed enhancements from the spec.

### D.1 — Add pagination to Skills list

`frontend/src/pages/skills/SkillListPage.tsx`

- [ ] Backend already returns `page`/`page_size` in response
- [ ] Add pagination controls below the card grid (Previous / Page N / Next)
- [ ] Pass `page` and `page_size` query params to the API
- [ ] Update `useSkillList` hook to accept page/pageSize parameters
- [ ] Playwright verify: with >12 skills, pagination controls appear and work

### D.2 — Add filter dropdown to Skills list

`frontend/src/pages/skills/SkillListPage.tsx`

- [ ] Add a filter dropdown next to the search input
- [ ] Initial filters: by author, by license (extracted from skill metadata)
- [ ] Can start as disabled/placeholder if metadata isn't consistently available
- [ ] Playwright verify: filter dropdown renders, disabled state is visually clear

### D.3 — Make create wizard preview dynamic

`frontend/src/pages/skills/SkillCreatePage.tsx`

- [ ] Current frontmatter preview in Step 1 is static mock text
- [ ] Update preview to reflect selected template's actual structure
- [ ] In Step 2, update preview to reflect user input (name, description, license, metadata)
- [ ] Real-time: as user types, preview panel updates
- [ ] Playwright verify: type in name field — preview panel shows the typed name

### D.4 — Auto-fill author from current user

`frontend/src/pages/skills/SkillCreatePage.tsx`

- [ ] In Step 2 form, `author` field should default to current user's name
- [ ] Get user name from `useRoles()` hook or `/api/me` response
- [ ] User can still override the default value
- [ ] Playwright verify: open create wizard — author field is pre-filled with user name

### D.5 — Add multi-tab support to editor

`frontend/src/pages/skills/SkillEditorPage.tsx`

- [ ] Currently only one file open at a time
- [ ] Add tab bar above Monaco editor showing open files
- [ ] Click tab to switch files, X button to close tab
- [ ] Track unsaved state per tab (amber dot indicator)
- [ ] Warn before closing tab with unsaved changes
- [ ] Playwright verify: open 2 files, switch between tabs, verify content is preserved

### D.6 — Add file upload to editor

`frontend/src/pages/skills/SkillEditorPage.tsx` + `FileTree.tsx`

- [ ] Add upload button to file tree toolbar (next to new file/folder buttons)
- [ ] Support click-to-upload and drag-and-drop onto the file tree
- [ ] Read file content, call `writeFile` API to upload
- [ ] Playwright verify: drag a .py file onto file tree — file appears in tree

### D.7 — Add cursor position to editor status bar

`frontend/src/pages/skills/SkillEditorPage.tsx`

- [ ] Monaco Editor exposes cursor position via `onDidChangeCursorPosition`
- [ ] Display "Ln {line}, Col {column}" in the status bar (bottom 24px bar)
- [ ] Update in real-time as cursor moves
- [ ] Playwright verify: click in editor — status bar shows correct Ln/Col

### D.8 — Make detail page right column sticky

`frontend/src/pages/skills/SkillDetailPage.tsx`

- [ ] Add `position: sticky; top: 64px` (below TopBar) to the right info panel
- [ ] Set `max-height: calc(100vh - 64px)` with `overflow-y: auto` for scrollable right panel
- [ ] Playwright verify: scroll a long SKILL.md — right panel stays visible

### D.9 — Add heading anchors to Markdown renderer

`frontend/src/components/skills/MarkdownRenderer.tsx`

- [ ] Generate `id` attributes on heading elements from heading text (slugified)
- [ ] Add a hover-visible anchor link icon (e.g., `#` or chain icon) next to each heading
- [ ] Clicking the anchor updates URL hash for shareable deep links
- [ ] Playwright verify: hover over a heading — anchor icon appears; click — URL hash updates

### D.10 — Add unsaved changes warning on navigation

`frontend/src/pages/skills/SkillEditorPage.tsx`

- [ ] Track dirty state in editor (content differs from last saved version)
- [ ] Use `beforeunload` event to warn on browser close/refresh
- [ ] Use React Router's `useBlocker` or `usePrompt` to warn on in-app navigation
- [ ] Playwright verify: edit a file, click sidebar link — warning dialog appears

### D.11 — Add keyboard shortcuts overlay

`frontend/src/pages/skills/SkillEditorPage.tsx`

- [ ] Add "Keyboard Shortcuts" button or Cmd+? shortcut
- [ ] Show modal/overlay with available shortcuts:
  - `Cmd+S` / `Ctrl+S` — Save file
  - `Cmd+P` / `Ctrl+P` — Quick file open (future)
  - Standard Monaco shortcuts
- [ ] Playwright verify: press Cmd+? — shortcuts overlay appears

---

## Phase E: Infrastructure & DevOps

**Priority:** Items that improve deployment, testing, and operational readiness.

### E.1 — Add health check and startup validation

`backend/app/main.py`

- [ ] Enhance `/api/health` to verify Blob Storage connectivity (lightweight container list or metadata call)
- [ ] Add startup event that validates required env vars are set
- [ ] Return structured health response: `{"status": "healthy", "blob_storage": "connected"}`
- [ ] Test: verify health endpoint returns appropriate status

### E.2 — Add structured logging

`backend/app/main.py` + service files

- [ ] Add Python `logging` with structured JSON format
- [ ] Log: auth failures (user, reason), blob errors, import/export operations
- [ ] Include request correlation ID (from header or generated)
- [ ] Do NOT log tokens, file contents, or PII beyond user OID


---

## Implementation Order

The recommended implementation order for a single developer:

```
Phase A (Security)    →  MUST be first, blocks production deployment
Phase B (Bug Fixes)   →  Fix correctness issues next
Phase C (Engineering) →  Improve reliability and DX
Phase D (Features)    →  Enhance UX last (most flexible ordering)
Phase E (Infra)       →  Can be interleaved with C and D
```

Within each phase, items are roughly ordered by priority/dependency. Items within the same phase can generally be done in any order, with these exceptions:

- **A.2** (path traversal) should be done before any work on file endpoints
- **B.1** and **B.2** are both in SkillEditorPage — do them together
- **C.1** (ProtectedRoute) should be done before D.5 (multi-tab) to avoid auth edge cases
- **D.5** (multi-tab) and **D.6** (file upload) both modify the editor — coordinate changes
- **D.10** (unsaved warning) depends on **D.5** (multi-tab) dirty state tracking

---

## Scope Exclusions

The following are explicitly **not in scope** for this plan:

- **Agents module** — Sidebar placeholder only
- **Prompts module** — Sidebar placeholder only
- **MCP Servers module** — Sidebar placeholder only
- **Version control / Git integration** — Future consideration
- **Publish/review workflow** — draft → published state machine
- **Full-text search** — CosmosDB or Azure AI Search
- **Team collaboration** — Azure AD group-based sharing
- **Usage analytics** — Install/call tracking
- **External consumer API** — OAuth for external agent access

These will be addressed in separate specs and plans when the Skills module is stable.
