# Skills Data Model

## What is a Skill?

A Skill is a **self-contained, portable capability package** for AI coding agents, conforming to the [agentskills.io](https://agentskills.io) open standard. It is a structured directory of files — instructions, scripts, and reference documents — that agents load to extend their behavior.

## Skill Directory Structure

```
skill-name/
├── SKILL.md              # REQUIRED — metadata + instructions
├── scripts/              # OPTIONAL — executable scripts
│   ├── main.py
│   └── helper.py
├── references/           # OPTIONAL — reference documents
│   ├── API_REFERENCE.md
│   └── FIELD_REFERENCE.md
└── assets/               # OPTIONAL — templates, configs
    └── template.json
```

## SKILL.md Format

The `SKILL.md` file serves a dual purpose:
1. **Machine-readable YAML frontmatter** — parsed by the platform and agents
2. **Human-readable Markdown body** — instructions that agents follow

### Example

```markdown
---
name: crm-opportunity
description: Manage CRM opportunities with CRUD operations
license: MIT
compatibility: Claude Code, Copilot, Codex
metadata:
  author: platform-team
  version: "1.0"
  category: crm
---

# CRM Opportunity Manager

This skill enables you to manage CRM opportunities...

## Available Scripts

- `scripts/create_opportunity.py` — Create a new opportunity
- `scripts/list_opportunities.py` — List all opportunities
...
```

### Frontmatter Schema

| Field | Required | Type | Constraints |
|-------|----------|------|-------------|
| `name` | Yes | string | 1-64 chars, lowercase alphanumeric + hyphens, no leading/trailing/consecutive hyphens |
| `description` | Yes | string | 1-1024 chars |
| `license` | No | string | e.g., "MIT", "Apache-2.0" |
| `compatibility` | No | string | Max 500 chars. Agent compatibility notes |
| `metadata` | No | dict | Arbitrary key-value pairs (author, version, etc.) |

### Validation Rules

**Errors** (blocking):
- Missing or empty `name`
- Name doesn't match directory name
- Invalid name format (uppercase, special chars, etc.)
- Missing `description`
- Description exceeds 1024 characters

**Warnings** (non-blocking):
- Missing `compatibility` field
- SKILL.md body exceeds 500 lines

## TypeScript Type

[`frontend/src/types/skill.ts`](https://github.com/carvychen/agent-platform/blob/main/frontend/src/types/skill.ts)

```typescript
interface Skill {
  name: string;
  description: string;
  license?: string;
  compatibility?: string;
  metadata?: Record<string, string>;
  file_count: number;
  total_size: number;
  created_at: string;     // ISO 8601
  modified_at: string;    // ISO 8601
  files?: SkillFile[];
}

interface SkillFile {
  path: string;
  size: number;
  last_modified: string;
}
```

## Skill Templates

The platform provides 4 templates for new skill creation:

### Blank Template
```
skill-name/
├── SKILL.md
├── scripts/
├── references/
└── assets/
```
General-purpose skeleton with empty directories.

### Script Template
```
skill-name/
├── SKILL.md
├── scripts/
│   └── main.py        # Starter Python script
├── references/
│   └── REFERENCE.md   # Reference documentation template
└── assets/
```
For skills that involve executable scripts (API calls, data processing).

### Instruction Template
```
skill-name/
├── SKILL.md            # Detailed prompt instructions
├── references/
└── assets/
```
For pure prompt-engineering skills with no scripts.

### MCP Template
```
skill-name/
├── SKILL.md
├── scripts/
│   └── client.py      # MCP/API client template
├── references/
│   └── API.md         # API endpoint documentation
└── assets/
```
For skills that interact with external APIs or MCP servers.

## Storage Model

Skills are stored in Azure Blob Storage with the following path convention:

```
skills-container/
└── {tenant_id}/
    └── {skill_name}/
        ├── SKILL.md
        ├── scripts/main.py
        └── ...
```

- **Container**: Single shared container (`skills-container`)
- **Tenant isolation**: First path segment is the Azure AD tenant ID
- **Skill scope**: Second segment is the skill name (unique per tenant)
- **Files**: Remaining path segments mirror the skill's directory structure

### Size and Limits

| Limit | Value |
|-------|-------|
| Skill name length | 1-64 characters |
| Description length | 1-1024 characters |
| File content | No enforced limit (planned) |
| Skills per tenant | No enforced limit |
| Files per skill | No enforced limit |
