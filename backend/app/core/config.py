from typing import Optional

from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    POSTGRES_HOST: str
    POSTGRES_PORT: int
    POSTGRES_DB: str
    POSTGRES_USER: str
    POSTGRES_PASSWORD: str

    REDIS_HOST: str
    REDIS_PORT: int

    MINIO_ENDPOINT: str
    MINIO_ROOT_USER: str
    MINIO_ROOT_PASSWORD: str
    MINIO_BUCKET: str

    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    # Optional single-user magic-login bypass. Both must be set for the
    # /auth/magic-login endpoint to work; it only ever logs in the one
    # account named by MAGIC_LOGIN_USER_EMAIL.
    MAGIC_LOGIN_TOKEN: Optional[str] = None
    MAGIC_LOGIN_USER_EMAIL: Optional[str] = None
    FRONTEND_URL: str = "http://localhost:3000"

    GOOGLE_API_KEY: str
    GOOGLE_API_KEY_FALLBACKS: str = ""

    class Config:
        env_file= ".env"

settings = Settings()
