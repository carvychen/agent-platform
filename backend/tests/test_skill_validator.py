import pytest
from app.services.skill_validator import validate_skill_name, validate_frontmatter


class TestValidateSkillName:
    def test_valid_simple_name(self):
        errors = validate_skill_name("crm-opportunity")
        assert errors == []

    def test_valid_single_word(self):
        errors = validate_skill_name("helper")
        assert errors == []

    def test_valid_with_numbers(self):
        errors = validate_skill_name("api-v2-client")
        assert errors == []

    def test_empty_name(self):
        errors = validate_skill_name("")
        assert len(errors) > 0

    def test_too_long(self):
        errors = validate_skill_name("a" * 65)
        assert len(errors) > 0

    def test_uppercase_rejected(self):
        errors = validate_skill_name("CRM-Opportunity")
        assert len(errors) > 0

    def test_starts_with_hyphen(self):
        errors = validate_skill_name("-bad-name")
        assert len(errors) > 0

    def test_ends_with_hyphen(self):
        errors = validate_skill_name("bad-name-")
        assert len(errors) > 0

    def test_consecutive_hyphens(self):
        errors = validate_skill_name("bad--name")
        assert len(errors) > 0

    def test_spaces_rejected(self):
        errors = validate_skill_name("bad name")
        assert len(errors) > 0


class TestValidateFrontmatter:
    def test_valid_minimal(self):
        result = validate_frontmatter({"name": "my-skill", "description": "Does things"})
        assert result.valid is True
        assert result.errors == []

    def test_missing_name(self):
        result = validate_frontmatter({"description": "Does things"})
        assert result.valid is False
        assert any(e["field"] == "name" for e in result.errors)

    def test_missing_description(self):
        result = validate_frontmatter({"name": "my-skill"})
        assert result.valid is False
        assert any(e["field"] == "description" for e in result.errors)

    def test_description_too_long(self):
        result = validate_frontmatter({
            "name": "my-skill",
            "description": "x" * 1025,
        })
        assert result.valid is False

    def test_compatibility_too_long(self):
        result = validate_frontmatter({
            "name": "my-skill",
            "description": "ok",
            "compatibility": "x" * 501,
        })
        assert result.valid is False

    def test_warning_for_missing_compatibility(self):
        result = validate_frontmatter({"name": "my-skill", "description": "ok"})
        assert result.valid is True
        assert any(w["field"] == "compatibility" for w in result.warnings)
