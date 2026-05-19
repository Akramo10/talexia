from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://crm_user:crm_password@localhost:5432/crm_db"
    email_host: str = ""
    email_user: str = ""
    email_app_password: str = ""
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"
    jwt_secret_key: str = "change-me-in-env"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24
    google_client_id: str = ""
    google_client_secret: str = ""
    google_redirect_uri: str = "http://localhost:8000/api/v1/gmail/callback"
    google_login_client_id: str = ""
    gmail_scopes: str = "openid,https://www.googleapis.com/auth/userinfo.email,https://www.googleapis.com/auth/gmail.send"
    aws_access_key_id: str = ""
    aws_secret_access_key: str = ""
    aws_region: str = "eu-north-1"
    aws_s3_bucket: str = "talexia-documents-prod"
    frontend_url: str = "http://localhost:5173"
    default_email_send_delay_seconds: int = 60

    model_config = SettingsConfigDict(env_file=(".env", "../.env"), extra="ignore")

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def gmail_scope_list(self) -> list[str]:
        return [scope.strip() for scope in self.gmail_scopes.split(",") if scope.strip()]

settings = Settings()
