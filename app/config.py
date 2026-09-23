from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str
    env: str = "development"
    # Comma-separated list of allowed CORS origins for local dev.
    cors_origins: str = (
        "http://localhost:3000,http://localhost:5173,http://localhost:5174,"
        "http://localhost:4173,http://127.0.0.1:3000,http://127.0.0.1:5173"
    )

    class Config:
        env_file = ".env"


settings = Settings()
