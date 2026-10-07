import os
from typing import List
from pydantic_settings import BaseSettings
from pydantic import Field

class Settings(BaseSettings):
    PROJECT_NAME: str = "DOA Workflow Tool"
    API_V1_STR: str = "/api"
    DATABASE_URL: str = "sqlite:///./doa.db"
    JWT_SECRET_KEY: str = "dev-super-secret-jwt-key-for-doa-workflow-prototype-2026"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:5174,http://localhost:3000,http://127.0.0.1:5173,http://127.0.0.1:5174,http://127.0.0.1:3000"
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4o-mini"
    
    # Groq API configuration (OpenAI-compatible)
    GROQ_API_KEY: str = ""
    GROQ_MODEL: str = "gemma2-9b-it"  # or llama-3.3-70b-versatile / custom OSS model
    GROQ_BASE_URL: str = "https://api.groq.com/openai/v1"

    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()
