from google import genai
from google.genai import types

from app.core.config import settings

GENERATION_MODEL = "gemini-3.5-flash"

class GenerationService:
    def __init__(self)-> None:
        self.client = genai.Client(
            api_key=settings.GOOGLE_API_KEY
        )

    def generate_answer(self, question: str, context: str) -> str:
        prompt = f"""
        Question:
        {question}

        Context:
        {context}
        """

        response = self.client.models.generate_content(
            model=GENERATION_MODEL,
            contents = prompt,
            config= types.GenerateContentConfig(
                temperature=0.1,
                system_instruction=(
                    "You are an academic assistant."
                    "Answer the user's question using only the provided context."
                    "Do not use outside knowledge."
                    "Do not guess or infer facts that are not supported by the context. "
                    "Do not begin answers with phrases such as 'Based on the provided context',"
                    "'According to the provided context', or similar meta-commentary."
                    "Simply give the answer"
                    "If the context does not contain enough information to answer the"
                    "question, clearly say that the provided course material does not"
                    "specify the answer."
                )
            )
        )

        if not response.text:
            raise ValueError("Gemini returned an empty response")

        return response.text