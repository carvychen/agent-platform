# API Reference

Base URL: `/api`

All endpoints except `/api/health` and `/api/skills/{name}/tar` require a valid Azure AD Bearer token.

## System Endpoints

### Health Check

```
GET /api/health
```

No authentication required.

**Response:**
```json
{ "status": "ok" }
```

### Current User

```
GET /api/me
```

Returns the authenticated user's profile from the JWT token.

**Response:**
```json
{
  "oid": "00000000-0000-0000-0000-000000000000",
  "name": "John Doe",
  "email": "john@example.com",
  "tenant_id": "00000000-0000-0000-0000-000000000000",
  "roles": ["SkillAdmin"]
}
```

## Skills Endpoints

### List Skills

```
GET /api/skills
```

**Auth:** SkillAdmin or SkillUser

Returns all skills for the caller's tenant.

**Response:**
```json
[
  {
    "name": "crm-opportunity",
    "description": "Manage CRM opportunities",
    "license": "MIT",
    "compatibility": "Claude Code, Copilot",
    "metadata": { "author": "team", "version": "1.0" },
    "file_count": 5,
    "total_size": 12480,
    "created_at": "2026-04-14T10:00:00Z",
    "modified_at": "2026-04-14T12:00:00Z"
  }
]
```

### Get Skill Detail

```
GET /api/skills/{name}
```

**Auth:** SkillAdmin or SkillUser

Returns skill metadata plus file listing.

**Response:**
```json
{
  "name": "crm-opportunity",
  "description": "Manage CRM opportunities",
  "license": "MIT",
  "files": [
    { "path": "SKILL.md", "size": 2048, "last_modified": "2026-04-14T12:00:00Z" },
    { "path": "scripts/main.py", "size": 1024, "last_modified": "2026-04-14T11:00:00Z" }
  ],
  "file_count": 5,
  "total_size": 12480,
  "created_at": "2026-04-14T10:00:00Z",
  "modified_at": "2026-04-14T12:00:00Z"
}
```

### Create Skill

```
POST /api/skills
```

**Auth:** SkillAdmin only

**Request Body:**
```json
{
  "name": "my-skill",
  "description": "A new skill",
  "template": "script",
  "license": "MIT",
  "metadata": { "author": "me" }
}
```

Templates: `blank`, `script`, `instruction`, `mcp`

### Import Skill

```
POST /api/skills/import?overwrite=false
```

**Auth:** SkillAdmin only

**Content-Type:** `multipart/form-data`

Upload a ZIP file containing a skill directory. The ZIP must contain a `SKILL.md` at the root level.

- Returns `409 Conflict` if the skill already exists (unless `overwrite=true`)
- Response includes `skill_name` in the error detail for conflict resolution

### Delete Skill

```
DELETE /api/skills/{name}
```

**Auth:** SkillAdmin only

Deletes the entire skill and all its files.

## File Operations

### Read File

```
GET /api/skills/{name}/files/{file_path}
```

**Auth:** SkillAdmin or SkillUser

Returns raw file content as text.

### Write File

```
PUT /api/skills/{name}/files/{file_path}
```

**Auth:** SkillAdmin only

**Request Body:**
```json
{
  "content": "file content here"
}
```

Creates or overwrites the file at the given path.

### Delete File

```
DELETE /api/skills/{name}/files/{file_path}
```

**Auth:** SkillAdmin only

### Rename File

```
POST /api/skills/{name}/files/{file_path}/rename
```

**Auth:** SkillAdmin only

**Request Body:**
```json
{
  "new_path": "scripts/renamed.py"
}
```

### Delete Folder

```
DELETE /api/skills/{name}/folders/{folder_path}
```

**Auth:** SkillAdmin only

Deletes all files under the specified folder prefix.

## Download & Install

### Download as ZIP

```
GET /api/skills/{name}/download
```

**Auth:** SkillAdmin or SkillUser

Streams the skill as a ZIP archive.

### Download as tar.gz (Token-Gated)

```
GET /api/skills/{name}/tar?token={install_token}
```

**Auth:** None (uses install token)

Streams the skill as a tar.gz archive. The token is single-use and expires after 300 seconds.

### Create Install Token

```
POST /api/skills/{name}/install-token
```

**Auth:** SkillAdmin or SkillUser

**Response:**
```json
{
  "tar_url": "https://host/api/skills/my-skill/tar?token=abc123...",
  "sas_urls": {
    "SKILL.md": "https://storage.blob.core.windows.net/...",
    "scripts/main.py": "https://storage.blob.core.windows.net/..."
  }
}
```

- `tar_url`: Single-use URL for CLI download
- `sas_urls`: Direct Azure Blob SAS URLs (5-minute TTL, read-only)

## Validation

### Validate Skill

```
POST /api/skills/{name}/validate
```

**Auth:** SkillAdmin or SkillUser

Validates the skill's SKILL.md frontmatter against the agentskills.io spec.

**Response:**
```json
{
  "valid": true,
  "errors": [],
  "warnings": [
    {
      "field": "compatibility",
      "message": "Missing compatibility field"
    }
  ]
}
```

## Error Format

All errors follow this structure:

```json
{
  "detail": "Error message"
}
```

| Status | Meaning |
|--------|---------|
| 400 | Bad request (validation failure) |
| 401 | Missing or invalid token |
| 403 | Insufficient role permissions |
| 404 | Skill or file not found |
| 409 | Skill already exists (import) |
| 500 | Internal server error |
