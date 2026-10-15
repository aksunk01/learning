import time

import httpx

from app.core.config import settings

EMBEDDING_MODEL = settings.OLLAMA_EMBEDDING_MODEL
EMBEDDING_DIMENSION = 768

_MAX_ATTEMPTS = 3
_REQUEST_TIMEOUT = 30.0


class EmbeddingError(Exception):
    """Raised when the Ollama embedding backend can't be reached or fails."""


class EmbeddingService:

    def __init__(self) -> None:
        self.base_url = settings.OLLAMA_BASE_URL.rstrip("/")
        self.model = settings.OLLAMA_EMBEDDING_MODEL

    def _embed_text(self, text: str) -> list[float]:
        last_error: EmbeddingError | None = None

        for attempt in range(1, _MAX_ATTEMPTS + 1):
            try:
                response = httpx.post(
                    f"{self.base_url}/api/embed",
                    json={"model": self.model, "input": text},
                    timeout=_REQUEST_TIMEOUT,
                )
            except httpx.ConnectError:
                last_error = EmbeddingError(
                    f"Could not connect to Ollama at {self.base_url}. Check that the "
                    f"server is running and reachable (e.g. over Tailscale) and that "
                    f"OLLAMA_BASE_URL is correct."
                )
            except httpx.TimeoutException:
                last_error = EmbeddingError(
                    f"Ollama request to {self.base_url} timed out after "
                    f"{_REQUEST_TIMEOUT}s."
                )
            else:
                if response.status_code == 404:
                    raise EmbeddingError(
                        f"Ollama model '{self.model}' is not available at "
                        f"{self.base_url}. Pull it first with: "
                        f"ollama pull {self.model}"
                    )

                if response.status_code >= 500:
                    last_error = EmbeddingError(
                        f"Ollama server error ({response.status_code}) from "
                        f"{self.base_url}: {response.text}"
                    )
                elif not response.is_success:
                    raise EmbeddingError(
                        f"Ollama embedding request failed ({response.status_code}): "
                        f"{response.text}"
                    )
                else:
                    data = response.json()
                    embeddings = data.get("embeddings")

                    if not embeddings:
                        raise EmbeddingError(
                            f"Ollama returned no embeddings for model '{self.model}'"
                        )

                    embedding = embeddings[0]

                    if len(embedding) != EMBEDDING_DIMENSION:
                        raise EmbeddingError(
                            f"Expected {EMBEDDING_DIMENSION} embedding dimensions "
                            f"from model '{self.model}', but received "
                            f"{len(embedding)}"
                        )

                    return embedding

            if attempt < _MAX_ATTEMPTS:
                time.sleep(2 ** (attempt - 1))

        raise last_error

    def embed_document(self, text: str, title: str) -> list[float]:
        formatted_text = f"search_document: {title}\n\n{text}"

        return self._embed_text(formatted_text)

    def embed_query(self, query: str) -> list[float]:
        formatted_query = f"search_query: {query}"

        return self._embed_text(formatted_query)
