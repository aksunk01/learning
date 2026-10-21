from typing import Callable, TypeVar

from google import genai
from google.genai import errors

from app.core.config import settings

T = TypeVar("T")


def _parse_api_keys() -> list[str]:
    raw_keys = [settings.GOOGLE_API_KEY, *settings.GOOGLE_API_KEY_FALLBACKS.split(",")]

    seen: set[str] = set()
    keys: list[str] = []

    for key in raw_keys:
        key = key.strip()

        if key and key not in seen:
            seen.add(key)
            keys.append(key)

    return keys


def _is_quota_exhausted(error: errors.APIError) -> bool:
    return error.code == 429


class GeminiClientPool:
    """Wraps one genai.Client per configured API key.

    Set GOOGLE_API_KEY_FALLBACKS to a comma-separated list of additional keys.
    When the active key's quota is exhausted (429 RESOURCE_EXHAUSTED), calls
    automatically move on to the next configured key instead of failing.
    """

    def __init__(self) -> None:
        api_keys = _parse_api_keys()

        if not api_keys:
            raise ValueError("No Gemini API keys configured")

        self._clients = [genai.Client(api_key=key) for key in api_keys]
        self._active_index = 0

    def run(self, fn: Callable[[genai.Client], T]) -> T:
        """Call fn(client), trying each configured client in turn starting
        from the currently active one, advancing past any whose quota is
        exhausted. Raises the last error if every key is exhausted."""
        last_error: errors.APIError | None = None

        for offset in range(len(self._clients)):
            index = (self._active_index + offset) % len(self._clients)

            try:
                result = fn(self._clients[index])
                self._active_index = index
                return result
            except errors.APIError as e:
                last_error = e

                if _is_quota_exhausted(e):
                    continue

                raise

        raise last_error
