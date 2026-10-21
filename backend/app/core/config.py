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

    # Self-hosted Ollama instance used for embeddings and RAG answer
    # generation. Reachable over Tailscale MagicDNS by default. Gemini
    # (GOOGLE_API_KEY above) is still used for non-RAG features (assignment
    # extraction, grading extraction, planner suggestions).
    OLLAMA_BASE_URL: str = "http://ollama-server:11434"
    OLLAMA_EMBEDDING_MODEL: str = "nomic-embed-text"
    OLLAMA_GENERATION_MODEL: str = "llama3.2:3b"

    # Separate model for task/planning answers ("what should I prioritize"),
    # which use a different system prompt and context shape (a structured
    # assignment list rather than document chunks) than material Q&A - so a
    # different model may suit it better. Defaults to OLLAMA_GENERATION_MODEL
    # when unset.
    OLLAMA_TASK_MODEL: Optional[str] = None

    # Small/fast model used to classify each question as task-related
    # (schedule/workload) vs. course-content before routing (see
    # RAGService._detect_task_query) - only ever needs to output one word,
    # so a lighter model than OLLAMA_GENERATION_MODEL keeps this cheap.
    OLLAMA_CLASSIFIER_MODEL: str = "llama3.2:3b"

    class Config:
        env_file= ".env"

settings = Settings()
