import json
import time
from typing import Iterator

import httpx

from app.core.config import settings

GENERATION_MODEL = settings.OLLAMA_GENERATION_MODEL

_MAX_ATTEMPTS = 3
_REQUEST_TIMEOUT = 120.0

SYSTEM_INSTRUCTION = (
    "You are an academic assistant. "
    "Answer the user's question directly using only the provided course material. "
    "Do not use outside knowledge. "
    "Do not guess or infer facts that are not supported by the course material. "
    "Each context source is labeled with a source identifier such as [1], [2], or [3]. "
    "When you make a factual claim supported by a source, cite the relevant source identifier "
    "immediately after the claim, for example: 'Class projects are worth 70% [1].' "
    "Use the smallest number of source citations necessary to support each factual claim. "
    "Only cite source identifiers that are actually present in the provided context. "
    "Do not invent source identifiers, filenames, page numbers, or citations. "
    "Do not add a separate Sources section because source details are returned separately. "
    "Do not begin answers with phrases such as 'Based on the provided context' or "
    "'According to the provided context'. "
    "Simply give the answer. "
    "If the course material does not contain enough information to answer the question, "
    "clearly say that the course material does not specify the answer."
)


class GenerationError(Exception):
    """Raised when the Ollama generation backend can't be reached or fails."""


def _build_prompt(question: str, context: str) -> str:
    return f"""
        Question:
        {question}

        Context:
        {context}
        """


def _payload(question: str, context: str, *, model: str, stream: bool) -> dict:
    return {
        "model": model,
        "messages": [
            {"role": "system", "content": SYSTEM_INSTRUCTION},
            {"role": "user", "content": _build_prompt(question, context)},
        ],
        "think": False,
        "stream": stream,
        "options": {"temperature": 0.1},
    }


class GenerationService:
    def __init__(self) -> None:
        self.base_url = settings.OLLAMA_BASE_URL.rstrip("/")
        self.model = settings.OLLAMA_GENERATION_MODEL
        self._client = httpx.Client(timeout=_REQUEST_TIMEOUT)

    def _connection_error(self) -> GenerationError:
        return GenerationError(
            f"Could not connect to Ollama at {self.base_url}. Check that the "
            f"server is running and reachable (e.g. over Tailscale) and that "
            f"OLLAMA_BASE_URL is correct."
        )

    def _timeout_error(self) -> GenerationError:
        return GenerationError(
            f"Ollama request to {self.base_url} timed out after {_REQUEST_TIMEOUT}s."
        )

    def _missing_model_error(self) -> GenerationError:
        return GenerationError(
            f"Ollama model '{self.model}' is not available at {self.base_url}. "
            f"Pull it first with: ollama pull {self.model}"
        )

    def generate_answer(self, question: str, context: str) -> str:
        payload = _payload(question, context, model=self.model, stream=False)
        last_error: GenerationError | None = None

        for attempt in range(1, _MAX_ATTEMPTS + 1):
            try:
                response = self._client.post(f"{self.base_url}/api/chat", json=payload)
            except httpx.ConnectError:
                last_error = self._connection_error()
            except httpx.TimeoutException:
                last_error = self._timeout_error()
            else:
                if response.status_code == 404:
                    raise self._missing_model_error()

                if response.status_code >= 500:
                    last_error = GenerationError(
                        f"Ollama server error ({response.status_code}) from "
                        f"{self.base_url}: {response.text}"
                    )
                elif not response.is_success:
                    raise GenerationError(
                        f"Ollama generation request failed "
                        f"({response.status_code}): {response.text}"
                    )
                else:
                    answer = response.json().get("message", {}).get("content")

                    if not answer:
                        raise GenerationError("Ollama returned an empty response")

                    return answer

            if attempt < _MAX_ATTEMPTS:
                time.sleep(2 ** (attempt - 1))

        raise last_error

    def stream_answer(self, question: str, context: str) -> Iterator[str]:
        """Yield the answer incrementally as text deltas arrive from the model."""
        payload = _payload(question, context, model=self.model, stream=True)
        last_error: GenerationError | None = None
        response: httpx.Response | None = None

        for attempt in range(1, _MAX_ATTEMPTS + 1):
            try:
                request = self._client.build_request(
                    "POST", f"{self.base_url}/api/chat", json=payload
                )
                response = self._client.send(request, stream=True)
            except httpx.ConnectError:
                last_error = self._connection_error()
            except httpx.TimeoutException:
                last_error = self._timeout_error()
            else:
                if response.status_code == 404:
                    response.close()
                    raise self._missing_model_error()

                if response.status_code >= 500:
                    last_error = GenerationError(
                        f"Ollama server error ({response.status_code}) from "
                        f"{self.base_url}: {response.read().decode(errors='replace')}"
                    )
                    response.close()
                elif not response.is_success:
                    body = response.read().decode(errors="replace")
                    response.close()
                    raise GenerationError(
                        f"Ollama generation request failed "
                        f"({response.status_code}): {body}"
                    )
                else:
                    break

            if attempt < _MAX_ATTEMPTS:
                time.sleep(2 ** (attempt - 1))
            response = None

        if response is None:
            raise last_error

        try:
            for line in response.iter_lines():
                if not line.strip():
                    continue

                event = json.loads(line)
                delta = event.get("message", {}).get("content")

                if delta:
                    yield delta

                if event.get("done"):
                    return
        finally:
            response.close()
