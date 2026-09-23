from google import genai
from google.genai import types, errors

import time

from app.core.config import settings

GENERATION_MODEL = "gemini-3.6-flash"

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

        max_attempts = 3

        for attempt in range(1, max_attempts + 1):
            try:
                response = self.client.models.generate_content(
                    model=GENERATION_MODEL,
                    contents = prompt,
                    config= types.GenerateContentConfig(
                        temperature=0.1,
                        system_instruction=(
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
                    )
                )

                break
            except errors.APIError as e:
                if e.code not in (429,503):
                    raise

                if attempt == max_attempts:
                    raise

                time.sleep(2**(attempt-1))

        if not response.text:
            raise ValueError("Gemini returned an empty response")

        return response.text