from google import genai
from google.genai import types

from app.core.config import settings

EMBEDDING_MODEL = "gemini-embedding-2"
EMBEDDING_DIMENSION = 768

class EmbeddingService:

    def __init__(self)->None:
        self.client = genai.Client(
            api_key=settings.GOOGLE_API_KEY
        )

    def _embed_text(self, text: str) -> list[float]:
        response = self.client.models.embed_content(
            model=EMBEDDING_MODEL,
            contents=text,
            config=types.EmbedContentConfig(
                output_dimensionality=EMBEDDING_DIMENSION
            )
        )

        embedding = response.embeddings[0].values

        if len(embedding) != EMBEDDING_DIMENSION:
            raise ValueError(
                f"Expected {EMBEDDING_DIMENSION} embedding dimensions, "
                f"but received {len(embedding)}"
            )

        return embedding

    def embed_document(self, text:str, title:str) -> list[float]:
        formatted_text = f"title: {title} | text: {text}"

        return self._embed_text(formatted_text)

    def embed_query(self, query: str) -> list[float]:
        formatted_query = (f"task: question answering | query: {query}")

        return self._embed_text(formatted_query)