from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str
    env: str = "development"

    class Config:
        env_file = ".env"


settings = Settings()
