"""アプリケーション設定"""
from pathlib import Path
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    postgres_host: str = "localhost"
    postgres_port: int = 5434
    postgres_user: str = "imgproc_user"
    postgres_password: str = "imgproc_password"
    postgres_db: str = "imgproc_db"
    database_url: str = ""

    upload_dir: str = "uploads"
    models_dir: str = "models"
    max_upload_mb: int = 20

    cors_origins: str = "http://localhost:3000"
    port: int = 8000

    class Config:
        env_file = ".env"
        extra = "ignore"

    def get_database_url(self) -> str:
        if self.database_url:
            url = self.database_url
        else:
            url = (
                f"postgresql://{self.postgres_user}:{self.postgres_password}"
                f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
            )
        if url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql+psycopg://", 1)
        elif url.startswith("postgresql://") and "+psycopg" not in url:
            url = url.replace("postgresql://", "postgresql+psycopg://", 1)
        return url

    def get_cors_origins(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def upload_path(self) -> Path:
        p = Path(self.upload_dir)
        p.mkdir(parents=True, exist_ok=True)
        return p

    @property
    def models_path(self) -> Path:
        p = Path(self.models_dir)
        p.mkdir(parents=True, exist_ok=True)
        return p


settings = Settings()
