import re
from dataclasses import dataclass, field


@dataclass
class ValidationResult:
    valid: bool = True
    errors: list[dict[str, str]] = field(default_factory=list)
    warnings: list[dict[str, str]] = field(default_factory=list)

    def add_error(self, field_name: str, message: str):
        self.valid = False
        self.errors.append({"field": field_name, "message": message})

    def add_warning(self, field_name: str, message: str):
        self.warnings.append({"field": field_name, "message": message})


NAME_PATTERN = re.compile(r"^[a-z0-9]([a-z0-9-]*[a-z0-9])?$")
CONSECUTIVE_HYPHENS = re.compile(r"--")


def validate_skill_name(name: str) -> list[str]:
    errors = []
    if not name:
        errors.append("Name is required")
        return errors
    if len(name) > 64:
        errors.append("Name must be 64 characters or fewer")
    if not NAME_PATTERN.match(name):
        errors.append(
            "Name must contain only lowercase letters, numbers, and hyphens. "
            "Must not start or end with a hyphen."
        )
    if CONSECUTIVE_HYPHENS.search(name):
        errors.append("Name must not contain consecutive hyphens")
    return errors


def validate_frontmatter(frontmatter: dict) -> ValidationResult:
    result = ValidationResult()

    # name: required
    name = frontmatter.get("name", "")
    if not name:
        result.add_error("name", "name is required")
    else:
        name_errors = validate_skill_name(name)
        for err in name_errors:
            result.add_error("name", err)

    # description: required, max 1024
    description = frontmatter.get("description", "")
    if not description:
        result.add_error("description", "description is required")
    elif len(description) > 1024:
        result.add_error("description", "description must be 1024 characters or fewer")

    # compatibility: optional, max 500
    compatibility = frontmatter.get("compatibility", "")
    if compatibility and len(compatibility) > 500:
        result.add_error("compatibility", "compatibility must be 500 characters or fewer")

    # warnings
    if not frontmatter.get("compatibility"):
        result.add_warning("compatibility", "Consider adding compatibility info")

    return result
