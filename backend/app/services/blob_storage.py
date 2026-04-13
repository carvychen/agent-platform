import yaml
from azure.storage.blob import BlobServiceClient, ContainerClient

from app.config import settings


class BlobStorageService:
    def __init__(self):
        blob_service = BlobServiceClient.from_connection_string(
            settings.blob_connection_string
        )
        self.container_client: ContainerClient = blob_service.get_container_client(
            settings.blob_container_name
        )

    def _user_prefix(self, user_id: str) -> str:
        return f"{user_id}/"

    def _skill_prefix(self, user_id: str, skill_name: str) -> str:
        return f"{user_id}/{skill_name}/"

    def _blob_path(self, user_id: str, skill_name: str, file_path: str) -> str:
        return f"{user_id}/{skill_name}/{file_path}"

    def list_skills(self, user_id: str) -> list[dict]:
        prefix = self._user_prefix(user_id)
        skill_names = set()
        for blob in self.container_client.list_blobs(name_starts_with=prefix):
            # Extract skill name: user-id/skill-name/...
            parts = blob.name[len(prefix) :].split("/")
            if parts:
                skill_names.add(parts[0])

        skills = []
        for name in sorted(skill_names):
            skill_md_path = self._blob_path(user_id, name, "SKILL.md")
            try:
                blob_client = self.container_client.get_blob_client(skill_md_path)
                content = blob_client.download_blob().readall().decode("utf-8")
                frontmatter = self._parse_frontmatter(content)
                file_count, total_size = self._count_files(user_id, name)
                props = blob_client.get_blob_properties()
                skills.append({
                    "name": name,
                    "description": frontmatter.get("description", ""),
                    "license": frontmatter.get("license", ""),
                    "compatibility": frontmatter.get("compatibility", ""),
                    "metadata": frontmatter.get("metadata", {}),
                    "file_count": file_count,
                    "total_size": total_size,
                    "created_at": props.creation_time.isoformat() if props.creation_time else "",
                    "modified_at": props.last_modified.isoformat() if props.last_modified else "",
                })
            except Exception:
                continue

        return skills

    def get_skill(self, user_id: str, skill_name: str) -> dict | None:
        skill_md_path = self._blob_path(user_id, skill_name, "SKILL.md")
        try:
            blob_client = self.container_client.get_blob_client(skill_md_path)
            content = blob_client.download_blob().readall().decode("utf-8")
            frontmatter = self._parse_frontmatter(content)
            files = self._list_files(user_id, skill_name)
            file_count, total_size = self._count_files(user_id, skill_name)
            props = blob_client.get_blob_properties()
            return {
                "name": skill_name,
                "description": frontmatter.get("description", ""),
                "license": frontmatter.get("license", ""),
                "compatibility": frontmatter.get("compatibility", ""),
                "metadata": frontmatter.get("metadata", {}),
                "files": files,
                "file_count": file_count,
                "total_size": total_size,
                "created_at": props.creation_time.isoformat() if props.creation_time else "",
                "modified_at": props.last_modified.isoformat() if props.last_modified else "",
            }
        except Exception:
            return None

    def create_skill(self, user_id: str, skill_name: str, files: dict[str, str]):
        for file_path, content in files.items():
            blob_path = self._blob_path(user_id, skill_name, file_path)
            blob_client = self.container_client.get_blob_client(blob_path)
            blob_client.upload_blob(content.encode("utf-8"), overwrite=True)

    def delete_skill(self, user_id: str, skill_name: str):
        prefix = self._skill_prefix(user_id, skill_name)
        for blob in self.container_client.list_blobs(name_starts_with=prefix):
            self.container_client.get_blob_client(blob.name).delete_blob()

    def read_file(self, user_id: str, skill_name: str, file_path: str) -> str | None:
        blob_path = self._blob_path(user_id, skill_name, file_path)
        try:
            blob_client = self.container_client.get_blob_client(blob_path)
            return blob_client.download_blob().readall().decode("utf-8")
        except Exception:
            return None

    def write_file(self, user_id: str, skill_name: str, file_path: str, content: str):
        blob_path = self._blob_path(user_id, skill_name, file_path)
        blob_client = self.container_client.get_blob_client(blob_path)
        blob_client.upload_blob(content.encode("utf-8"), overwrite=True)

    def delete_file(self, user_id: str, skill_name: str, file_path: str):
        blob_path = self._blob_path(user_id, skill_name, file_path)
        blob_client = self.container_client.get_blob_client(blob_path)
        blob_client.delete_blob()

    def _list_files(self, user_id: str, skill_name: str) -> list[dict]:
        prefix = self._skill_prefix(user_id, skill_name)
        files = []
        dirs_seen = set()
        for blob in self.container_client.list_blobs(name_starts_with=prefix):
            relative_path = blob.name[len(prefix) :]
            files.append({
                "path": relative_path,
                "is_directory": False,
                "size": blob.size,
            })
            # Track directories
            parts = relative_path.split("/")
            if len(parts) > 1:
                dir_path = parts[0] + "/"
                if dir_path not in dirs_seen:
                    dirs_seen.add(dir_path)
        return files

    def _count_files(self, user_id: str, skill_name: str) -> tuple[int, int]:
        prefix = self._skill_prefix(user_id, skill_name)
        count = 0
        total_size = 0
        for blob in self.container_client.list_blobs(name_starts_with=prefix):
            count += 1
            total_size += blob.size
        return count, total_size

    @staticmethod
    def _parse_frontmatter(content: str) -> dict:
        if not content.startswith("---"):
            return {}
        parts = content.split("---", 2)
        if len(parts) < 3:
            return {}
        try:
            return yaml.safe_load(parts[1]) or {}
        except yaml.YAMLError:
            return {}
