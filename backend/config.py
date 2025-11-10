from functools import lru_cache
from dotenv import load_dotenv
from pydantic_settings import BaseSettings

load_dotenv()


class Settings(BaseSettings):
    # Supabase Configuration
    supabase_url: str
    supabase_anon_key: str
    supabase_service_key: str

    # Application Configuration
    environment: str
    log_level: str
    cors_origins: str

    # File Upload Configuration
    max_file_size: int
    allowed_mime_types: str
    thumbnail_size: int


@lru_cache()
def get_settings() -> Settings:
    return Settings()
