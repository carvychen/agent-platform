from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Azure Blob Storage
    blob_connection_string: str = ""
    blob_container_name: str = "skills-container"

    # Azure AD
    azure_ad_tenant_id: str = ""
    azure_ad_client_id: str = ""
    azure_ad_audience: str = ""

    # CORS
    cors_origins: list[str] = ["http://localhost:5173"]

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
