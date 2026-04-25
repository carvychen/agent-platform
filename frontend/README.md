# Agent Platform — Frontend

React SPA for the Agent Platform admin plane. Provides UIs for the Skill Hub (full CRUD + editor + import/export + install-token flow) and the MCP Hub (register external MCP server endpoints); Prompt Hub and Agent Hub are 501 stubs today.

Features a VS Code-like editor with Monaco, Azure AD authentication with **RBAC role control** (SkillAdmin / SkillUser), multi-agent install guides, and ZIP import/export.

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | React + TypeScript | 19 |
| Build | Vite | 8 |
| Styling | Tailwind CSS + Lucide Icons | 4 |
| Auth | MSAL.js (`@azure/msal-browser` + `@azure/msal-react`) | 5 |
| Editor | Monaco Editor (`@monaco-editor/react`) | 4.7 |
| Data | TanStack React Query + Axios | 5 |
| Forms | React Hook Form + Zod | 7 / 4 |
| Routing | React Router | 7 |
| Markdown | react-markdown + remark-gfm + react-syntax-highlighter | — |
| Utilities | class-variance-authority, clsx, tailwind-merge | — |

## Quick Start

### Prerequisites

- Node.js 18+
- Backend API running on `http://localhost:8000` (see `backend/README.md`)
- Azure AD App Registration (same one used by the backend, with App Roles configured)

### Setup

```bash
cd frontend
npm install

cp .env.example .env
# Edit .env with your Azure AD values

npm run dev
```

App available at `http://localhost:5173`. Vite proxies `/api` to `http://localhost:8000`.

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_AZURE_AD_CLIENT_ID` | App Registration client ID | `7dfbd42d-7504-...` |
| `VITE_AZURE_AD_TENANT_ID` | Entra ID tenant ID | `16b3c013-d300-...` |

## Routes

| Path | Page | Description |
|------|------|-------------|
| `/` | — | Redirects to `/skills` |
| `/skills` | SkillListPage | Card grid with search + import |
| `/skills/new` | SkillCreatePage | Template selection + metadata form |
| `/skills/:name` | SkillDetailPage | Markdown preview + install + export |
| `/skills/:name/edit` | SkillEditorPage | Monaco editor + file tree |

## Pages

### Skills List (`/skills`)

- 3-column card grid with colored icons (5 colors cycling)
- Search: filters by name + description (client-side)
- "+ New Skill" button (SkillAdmin only) with Import Skill dropdown
- Import dialog: ZIP upload with overwrite confirmation
- Empty state guides users to create their first skill
- "Showing X of Y skills" count

### Create Wizard (`/skills/new`)

**Step 1 — Choose Template:** 4 template cards (Blank, Script-based, Instruction-only, MCP Integration) with file tree preview.

**Step 2 — Basic Info:** Form with name (live regex validation), description (character count), license (dropdown, default MIT), author, version (default 1.0). Creates skill via API and redirects to editor.

SkillAdmin only — SkillUser is redirected to list page.

### Editor (`/skills/:name/edit`)

- **Top bar (dark):** Back arrow, skill name (mono), version badge, save status indicator (green/amber dot), Validate + Preview + Save buttons
- **File tree (240px):** Expandable folders, file selection, right-click context menu (rename, delete), bottom toolbar (new file, new folder)
- **Monaco Editor:** Custom `skills-dark` theme, syntax highlighting for Markdown/YAML/Python/JS/TS/JSON/Shell, Cmd+S / Ctrl+S save
- **Status bar (24px):** Language type, UTF-8 encoding, agentskills.io validation results

SkillAdmin only — SkillUser is redirected to detail page.

### Detail / Preview (`/skills/:name`)

- **Hero header:** Gradient icon, name (28px mono), full description, metadata pills
- **Left column:** Rendered SKILL.md (GFM with syntax-highlighted code blocks + copy buttons)
- **Right column:**
  - File Structure — expandable read-only file tree with sizes
  - How to Use — install commands for 6 agents (Claude Code, Copilot, Codex, Cursor, Windsurf, OpenCode) with copy buttons
  - Export — ZIP download + tar URL generation via install token
  - Details — created/modified dates, total size, file count
- **Actions:** Edit (blue), Export dropdown, Delete (red)

## Authentication & RBAC

### Auth Flow

1. `AuthProvider` initializes MSAL → `handleRedirectPromise()` → account restoration
2. No active account → MSAL redirects to Azure AD login
3. On login → MSAL acquires access token (with `roles` claim)
4. Axios interceptor attaches `Authorization: Bearer <token>` to all `/api` requests
5. Token is cached with 60s expiry buffer; concurrent requests share inflight token acquisition

### Role-Based UI

| Feature | SkillAdmin | SkillUser |
|---------|:----------:|:---------:|
| View skills list | Yes | Yes |
| View skill detail | Yes | Yes |
| Download / Export | Yes | Yes |
| Install commands | Yes | Yes |
| Create skill | Yes | — |
| Edit skill | Yes | — |
| Delete skill | Yes | — |
| Import skill | Yes | — |

`useRoles()` hook fetches current user info from `/api/me` and exposes `isAdmin`, `canRead`, `canWrite`. Write-only UI elements are conditionally rendered.

## Design System

### Fonts

- **Sans:** DM Sans (body text)
- **Mono:** JetBrains Mono (code, editor, skill names)

### Color Palette

| Token | Value | Usage |
|-------|-------|-------|
| `--color-primary` | `#3B82F6` | Buttons, active states, links |
| `--color-sidebar` | `#0F0F1A` | Sidebar background |
| `--color-editor-bg` | `#1E1E2E` | Editor background |
| `--color-surface` | `#FAFAFA` | Page background |
| `--color-card` | `#FFFFFF` | Card background |
| `--color-text-primary` | `#0F0F1A` | Main text |
| `--color-text-muted` | `#9CA3AF` | Secondary text |
| `--color-success` | `#10B981` | Validation pass, saved state |
| `--color-danger` | `#EF4444` | Delete, errors |

### Tailwind CSS v4

CSS-first configuration — all theme tokens defined in `@theme {}` blocks in `index.css`. No `tailwind.config.ts`. The `@tailwindcss/vite` plugin handles integration.

## Scripts

```bash
npm run dev       # Vite dev server (port 5173, proxies /api → :8000)
npm run build     # TypeScript check + production build
npm run lint      # ESLint check
npm run preview   # Preview production build locally
```

## Data Flow

```
User Action
  → React Hook Form (validation)
  → useCreateSkill / useSaveFile (React Query mutation)
  → skillsApi.ts (API function)
  → axiosClient.ts (JWT interceptor attaches cached token)
  → Vite proxy (/api → localhost:8000)
  → FastAPI backend
  → Azure Blob Storage
```

Mutations automatically invalidate related query caches. File delete/rename/folder-delete use optimistic updates for instant UI feedback.
