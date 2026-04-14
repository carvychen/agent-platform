# Architecture Overview

## System Architecture

```mermaid
graph TD
    subgraph "Frontend (React 19 SPA)"
        MSAL["MSAL.js v5\nAzure AD Login"]
        RQ["TanStack Query v5\nServer State Cache"]
        AXIOS["Axios Client\nToken Interceptor"]
        PAGES["Pages\nList / Detail / Create / Editor"]
    end

    subgraph "Backend (FastAPI)"
        CORS["CORS Middleware"]
        AUTH["JWT Auth\nRS256 + JWKS Cache"]
        RBAC["RBAC\nSkillAdmin / SkillUser"]
        ROUTER["Skills Router\n14 endpoints"]
        BLOB_SVC["BlobStorageService\nThreadPoolExecutor"]
        TOKEN_SVC["InstallTokenStore\nIn-Memory Single-Use"]
        VALIDATOR["SkillValidator\nFrontmatter Checks"]
    end

    subgraph "Azure Services"
        ENTRA["Azure AD / Entra ID\nJWKS + App Roles"]
        BLOB["Azure Blob Storage\nskills-container"]
    end

    MSAL -- "Login Redirect" --> ENTRA
    PAGES --> RQ --> AXIOS
    AXIOS -- "Bearer JWT" --> CORS
    CORS --> AUTH
    AUTH -- "Fetch JWKS" --> ENTRA
    AUTH --> RBAC --> ROUTER
    ROUTER --> BLOB_SVC & TOKEN_SVC & VALIDATOR
    BLOB_SVC -- "DefaultAzureCredential" --> BLOB
```

## Data Flow

### Read Path (List / View Skills)

```mermaid
sequenceDiagram
    participant U as User Browser
    participant RQ as React Query
    participant AX as Axios Client
    participant BE as FastAPI
    participant BS as Blob Storage

    U->>RQ: Navigate to /skills
    RQ->>AX: GET /api/skills
    AX->>AX: Attach cached Bearer token
    AX->>BE: GET /api/skills (proxied)
    BE->>BE: Validate JWT + check roles
    BE->>BS: List blobs (tenant_id/ prefix)
    BS-->>BE: Blob list
    BE->>BE: Parse SKILL.md frontmatter per skill
    BE-->>AX: JSON skill array
    AX-->>RQ: Cache with 30s staleTime
    RQ-->>U: Render SkillCard grid
```

### Write Path (Edit + Save File)

```mermaid
sequenceDiagram
    participant U as User
    participant ED as Monaco Editor
    participant MUT as useSaveFile Mutation
    participant AX as Axios
    participant BE as FastAPI (SkillAdmin only)
    participant BS as Blob Storage

    U->>ED: Edit file content
    U->>ED: Ctrl+S / Save button
    ED->>MUT: saveFile(skillName, path, content)
    MUT->>AX: PUT /api/skills/{name}/files/{path}
    AX->>BE: PUT with Bearer token
    BE->>BE: require_admin check
    BE->>BS: Upload blob (overwrite)
    BS-->>BE: Success
    BE-->>MUT: 200 OK
    MUT->>MUT: Invalidate query cache
    MUT-->>U: isDirty = false
```

### Install Path (Agent Downloads Skill)

```mermaid
sequenceDiagram
    participant U as Platform User
    participant FE as React SPA
    participant BE as FastAPI
    participant CLI as Agent CLI
    participant BS as Blob Storage

    U->>FE: Click "Install" on skill
    FE->>BE: POST /api/skills/{name}/install-token
    BE->>BE: Generate single-use token (300s TTL)
    BE-->>FE: { tar_url, sas_urls }
    FE-->>U: Show curl command with tar_url

    Note over U,CLI: User copies command to terminal

    CLI->>BE: GET /api/skills/{name}/tar?token=xxx
    BE->>BE: Validate & consume token
    BE->>BS: Download all files
    BS-->>BE: File contents
    BE-->>CLI: Stream tar.gz
    CLI->>CLI: Extract to .claude/skills/{name}/
```

## Directory Structure

```
agent-platform/
├── backend/
│   ├── app/
│   │   ├── auth/
│   │   │   └── dependencies.py    # JWT validation + RBAC
│   │   ├── models/
│   │   │   └── skill.py           # Pydantic request schemas
│   │   ├── routers/
│   │   │   └── skills.py          # 14 REST endpoints
│   │   ├── services/
│   │   │   ├── blob_storage.py    # Azure Blob CRUD
│   │   │   ├── install_token.py   # Single-use token store
│   │   │   └── skill_validator.py # Frontmatter validation
│   │   ├── config.py              # pydantic-settings
│   │   └── main.py                # FastAPI app factory
│   └── tests/
├── frontend/
│   ├── src/
│   │   ├── api/                   # Axios client + API functions
│   │   ├── auth/                  # MSAL config, hooks, provider
│   │   ├── components/
│   │   │   ├── layout/            # AppLayout, Sidebar
│   │   │   ├── skills/            # FileTree, SkillCard, etc.
│   │   │   └── ui/                # Breadcrumb, SearchInput, etc.
│   │   ├── hooks/                 # useSkills, useSkillFiles
│   │   ├── pages/skills/          # List, Detail, Create, Editor
│   │   ├── types/                 # TypeScript interfaces
│   │   └── utils/                 # zipAssembler
│   └── package.json
├── docs/                          # Design specs and plans
└── wiki/                          # GitHub Wiki source
```

## Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Storage | Azure Blob (no DB) | Skills are file collections, not relational data |
| Tenant isolation | Blob path prefix (`{tid}/`) | Simple, no extra DB needed, leverages JWT claim |
| Auth | Azure AD App Roles | Enterprise SSO, no custom user management |
| Install mechanism | Single-use token + tar stream | CLI agents can't do OAuth; short-lived tokens are secure |
| Editor | Monaco Editor | Same engine as VS Code; familiar to developers |
| State management | TanStack Query only | Server state is the source of truth; no local Redux needed |
