from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    # Database
    supabase_url: str
    supabase_key: str
    supabase_service_key: str
    
    # Google AI
    google_api_key: str
    
    # JWT
    secret_key: str = "your-secret-key-change-this-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    
    # File upload
    max_file_size: int = 50 * 1024 * 1024  # 50MB
    upload_dir: str = "uploads"
    
    # Embedding
    embedding_model: str = "models/text-embedding-004"
    chunk_size: int = 512
    chunk_overlap: int = 50
    
    # LLM
    llm_model: str = "gemini-2.0-flash-exp"
    max_tokens: int = 8192
    temperature: float = 0.7
    
    class Config:
        env_file = ".env"

settings = Settings()