import json
import time
from typing import Iterator

import httpx

from app.core.config import settings

GENERATION_MODEL = settings.OLLAMA_GENERATION_MODEL

_MAX_ATTEMPTS = 3
_REQUEST_TIMEOUT = 120.0
_MAX_HISTORY_MESSAGES = 10  # ~5 prior user/assistant turns; bounds prompt size

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

TASK_SYSTEM_INSTRUCTION = (
    "You are an academic planning assistant. "
    "You are given the user's assignments (title, course, type, due date, and "
    "weight/points where known), each in a list labeled with an identifier "
    "such as [1], [2], or [3]. Those identifiers are only for you to tell "
    "list entries apart internally - the user never sees that list, so never "
    "write a bracketed identifier like [1] in your answer. "
    "Answer the user's question using only that list. "
    "Do not invent assignments, due dates, or courses that are not in it. "
    "If an assignment's weight or points are not given in the list, do not "
    "state a number for it - say it's unspecified instead of guessing one. "
    "When the user asks what to prioritize, reason about both urgency (how "
    "soon something is due, and whether it's overdue) and importance (exams "
    "and higher-weight/point items generally matter more than low-stakes "
    "homework). "
    "When you reference a specific assignment, name it by its title instead "
    "of its identifier, for example: 'Finish the Lab 2 report first.' "
    "Be concise: give your prioritized recommendation once, as a short "
    "ranked list with a brief reason for each item. Do not restate the full "
    "list of assignments more than once and do not repeat the same ranking "
    "in multiple sections. "
    "If the list is empty or does not cover what the user asked about, say so "
    "directly rather than guessing."
)


CLASSIFIER_SYSTEM_INSTRUCTION = (
    "You are a classifier for an academic assistant. Decide whether the "
    "user's question is about their personal schedule or workload - due "
    "dates, deadlines, what to do, prioritization, overdue items - rather "
    "than about course content or material - concepts, explanations, "
    "syllabus policies, grading breakdowns, document content. "
    "Respond with exactly one word and nothing else: TASK or CONTENT."
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


def _payload(question: str, context: str, history: list[dict] | None, *, model: str, stream: bool, system_instruction: str = SYSTEM_INSTRUCTION) -> dict:
    messages = [{"role": "system", "content": system_instruction}]

    if history:
        messages.extend(history[-_MAX_HISTORY_MESSAGES:])

    messages.append({"role": "user", "content": _build_prompt(question, context)})

    return {
        "model": model,
        "messages": messages,
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

    def _missing_model_error(self, model: str) -> GenerationError:
        return GenerationError(
            f"Ollama model '{model}' is not available at {self.base_url}. "
            f"Pull it first with: ollama pull {model}"
        )

    def classify_question(self, question: str) -> bool:
        """Returns True if the question is about the user's schedule/workload
        rather than course content. Single attempt, no retries - this is a
        cheap pre-routing step and should fail fast so the caller can fall
        back to the keyword heuristic rather than stall the actual answer."""
        payload = {
            "model": settings.OLLAMA_CLASSIFIER_MODEL,
            "messages": [
                {"role": "system", "content": CLASSIFIER_SYSTEM_INSTRUCTION},
                {"role": "user", "content": question},
            ],
            "think": False,
            "stream": False,
            "options": {"temperature": 0, "num_predict": 5},
        }

        try:
            response = self._client.post(f"{self.base_url}/api/chat", json=payload)
        except httpx.ConnectError:
            raise self._connection_error()
        except httpx.TimeoutException:
            raise self._timeout_error()

        if response.status_code == 404:
            raise self._missing_model_error(settings.OLLAMA_CLASSIFIER_MODEL)

        if not response.is_success:
            raise GenerationError(
                f"Ollama classification request failed "
                f"({response.status_code}): {response.text}"
            )

        answer = response.json().get("message", {}).get("content", "")
        return "task" in answer.strip().lower()

    def generate_answer(self, question: str, context: str, history: list[dict] | None = None, system_instruction: str = SYSTEM_INSTRUCTION, model: str | None = None) -> str:
        model = model or self.model
        payload = _payload(question, context, history, model=model, stream=False, system_instruction=system_instruction)
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
                    raise self._missing_model_error(model)

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

    def stream_answer(self, question: str, context: str, history: list[dict] | None = None, system_instruction: str = SYSTEM_INSTRUCTION, model: str | None = None) -> Iterator[str]:
        """Yield the answer incrementally as text deltas arrive from the model."""
        model = model or self.model
        payload = _payload(question, context, history, model=model, stream=True, system_instruction=system_instruction)
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
                    raise self._missing_model_error(model)

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
