from fastapi import APIRouter, Depends, HTTPException, status

from app.auth.dependencies import get_current_user, UserInfo
from app.models.skill import SkillCreateRequest, FileWriteRequest
from app.services.blob_storage import BlobStorageService
from app.services.skill_validator import validate_skill_name, validate_frontmatter

router = APIRouter(prefix="/api/skills", tags=["skills"])

_blob_service: BlobStorageService | None = None


def get_blob_service() -> BlobStorageService:
    global _blob_service
    if _blob_service is None:
        _blob_service = BlobStorageService()
    return _blob_service


TEMPLATES = {
    "blank": {
        "SKILL.md": "---\nname: {name}\ndescription: {description}\n{license}{metadata}---\n\n# {title}\n\nAdd your skill instructions here.\n",
        "scripts/.gitkeep": "",
        "references/.gitkeep": "",
        "assets/.gitkeep": "",
    },
    "script": {
        "SKILL.md": '---\nname: {name}\ndescription: {description}\n{license}{metadata}---\n\n# {title}\n\n## Available Scripts\n\n| Script | Description | Required Args |\n|--------|-------------|---------------|\n| `scripts/main.py` | Main script | `--input` |\n\n## Usage\n\n```bash\npython scripts/main.py --input "value"\n```\n',
        "scripts/main.py": '"""Main script for {name} skill."""\nimport argparse\n\n\ndef main():\n    parser = argparse.ArgumentParser(description="{description}")\n    parser.add_argument("--input", required=True, help="Input value")\n    args = parser.parse_args()\n    print(f"Processing: {{args.input}}")\n\n\nif __name__ == "__main__":\n    main()\n',
        "references/REFERENCE.md": "# Reference\n\nAdd detailed technical reference here.\n",
        "assets/.gitkeep": "",
    },
    "instruction": {
        "SKILL.md": "---\nname: {name}\ndescription: {description}\n{license}{metadata}---\n\n# {title}\n\n## When to Use\n\nDescribe when this skill should be activated.\n\n## Instructions\n\n1. Step one\n2. Step two\n3. Step three\n\n## Examples\n\n**Example 1:**\nInput: ...\nOutput: ...\n\n## Edge Cases\n\n- Handle case A by...\n- Handle case B by...\n",
        "references/.gitkeep": "",
        "assets/.gitkeep": "",
    },
    "mcp": {
        "SKILL.md": '---\nname: {name}\ndescription: {description}\n{license}{metadata}compatibility: Requires Python 3.10+, httpx\n---\n\n# {title}\n\n## Scripts\n\n| Script | Description |\n|--------|-------------|\n| `scripts/client.py` | API client |\n\n## Setup\n\n1. Set environment variables in `.env`\n2. Run: `python scripts/client.py --action list`\n',
        "scripts/client.py": '"""MCP/API client for {name} skill."""\nimport argparse\nimport httpx\nimport os\n\n\nAPI_BASE_URL = os.getenv("API_BASE_URL", "https://api.example.com")\nAPI_KEY = os.getenv("API_KEY", "")\n\n\ndef make_request(action: str) -> dict:\n    headers = {{"Authorization": f"Bearer {{API_KEY}}"}}\n    with httpx.Client(base_url=API_BASE_URL, headers=headers) as client:\n        resp = client.get(f"/{{action}}")\n        resp.raise_for_status()\n        return resp.json()\n\n\ndef main():\n    parser = argparse.ArgumentParser(description="{description}")\n    parser.add_argument("--action", required=True, help="API action")\n    args = parser.parse_args()\n    result = make_request(args.action)\n    print(result)\n\n\nif __name__ == "__main__":\n    main()\n',
        "references/API.md": "# API Reference\n\n## Base URL\n\n`https://api.example.com`\n\n## Authentication\n\nBearer token via `API_KEY` environment variable.\n\n## Endpoints\n\n### GET /list\n\nReturns all items.\n",
        "assets/.gitkeep": "",
    },
}


def _render_template(template_files: dict, req: SkillCreateRequest) -> dict[str, str]:
    title = req.name.replace("-", " ").title()
    license_line = f"license: {req.license}\n" if req.license else ""
    metadata_lines = ""
    if req.metadata:
        metadata_lines = "metadata:\n"
        for k, v in req.metadata.items():
            metadata_lines += f'  {k}: "{v}"\n'

    rendered = {}
    for path, content in template_files.items():
        rendered[path] = content.format(
            name=req.name,
            description=req.description,
            title=title,
            license=license_line,
            metadata=metadata_lines,
        )
    return rendered


@router.get("")
def list_skills(
    user: UserInfo = Depends(get_current_user),
    blob: BlobStorageService = Depends(get_blob_service),
):
    skills = blob.list_skills(user.oid)
    return {"skills": skills, "total": len(skills), "page": 1, "page_size": len(skills)}


@router.post("", status_code=status.HTTP_201_CREATED)
def create_skill(
    req: SkillCreateRequest,
    user: UserInfo = Depends(get_current_user),
    blob: BlobStorageService = Depends(get_blob_service),
):
    name_errors = validate_skill_name(req.name)
    if name_errors:
        raise HTTPException(status_code=422, detail=name_errors)

    existing = blob.get_skill(user.oid, req.name)
    if existing:
        raise HTTPException(status_code=409, detail=f"Skill '{req.name}' already exists")

    template_files = TEMPLATES.get(req.template, TEMPLATES["blank"])
    rendered = _render_template(template_files, req)
    blob.create_skill(user.oid, req.name, rendered)

    return blob.get_skill(user.oid, req.name)


@router.get("/{name}")
def get_skill(
    name: str,
    user: UserInfo = Depends(get_current_user),
    blob: BlobStorageService = Depends(get_blob_service),
):
    skill = blob.get_skill(user.oid, name)
    if not skill:
        raise HTTPException(status_code=404, detail=f"Skill '{name}' not found")
    return skill


@router.delete("/{name}", status_code=status.HTTP_204_NO_CONTENT)
def delete_skill(
    name: str,
    user: UserInfo = Depends(get_current_user),
    blob: BlobStorageService = Depends(get_blob_service),
):
    skill = blob.get_skill(user.oid, name)
    if not skill:
        raise HTTPException(status_code=404, detail=f"Skill '{name}' not found")
    blob.delete_skill(user.oid, name)


@router.get("/{name}/files/{file_path:path}")
def read_file(
    name: str,
    file_path: str,
    user: UserInfo = Depends(get_current_user),
    blob: BlobStorageService = Depends(get_blob_service),
):
    content = blob.read_file(user.oid, name, file_path)
    if content is None:
        raise HTTPException(status_code=404, detail=f"File '{file_path}' not found")
    return {"path": file_path, "content": content}


@router.put("/{name}/files/{file_path:path}")
def write_file(
    name: str,
    file_path: str,
    req: FileWriteRequest,
    user: UserInfo = Depends(get_current_user),
    blob: BlobStorageService = Depends(get_blob_service),
):
    skill = blob.get_skill(user.oid, name)
    if not skill:
        raise HTTPException(status_code=404, detail=f"Skill '{name}' not found")
    blob.write_file(user.oid, name, file_path, req.content)
    return {"path": file_path, "size": len(req.content.encode("utf-8"))}


@router.delete("/{name}/files/{file_path:path}", status_code=status.HTTP_204_NO_CONTENT)
def delete_file(
    name: str,
    file_path: str,
    user: UserInfo = Depends(get_current_user),
    blob: BlobStorageService = Depends(get_blob_service),
):
    blob.delete_file(user.oid, name, file_path)


@router.post("/{name}/validate")
def validate_skill(
    name: str,
    user: UserInfo = Depends(get_current_user),
    blob: BlobStorageService = Depends(get_blob_service),
):
    content = blob.read_file(user.oid, name, "SKILL.md")
    if content is None:
        raise HTTPException(status_code=404, detail="SKILL.md not found")

    frontmatter = BlobStorageService._parse_frontmatter(content)
    result = validate_frontmatter(frontmatter)

    # Check name matches directory
    if frontmatter.get("name") != name:
        result.add_error("name", f"name '{frontmatter.get('name')}' does not match directory '{name}'")

    line_count = len(content.splitlines())
    if line_count > 500:
        result.add_warning("body", f"SKILL.md has {line_count} lines (recommended < 500)")

    return {"valid": result.valid, "errors": result.errors, "warnings": result.warnings}
