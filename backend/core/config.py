from pathlib import Path
from pydantic_settings import BaseSettings

_PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
_ENV_FILE = _PROJECT_ROOT / ".env"


class Settings(BaseSettings):
    postgres_host: str = "db.pjhwlxdcyaeuyrrlxkwg.supabase.co"
    postgres_port: int = 5432
    postgres_db: str = "post"
    postgres_user: str = "postgres"
    postgres_password: str = "umdoistres45"
    openai_api_key: str = ""

    model_config = {
        "env_file": str(_ENV_FILE) if _ENV_FILE.exists() else None,
        "extra": "ignore",
    }


settings = Settings()
