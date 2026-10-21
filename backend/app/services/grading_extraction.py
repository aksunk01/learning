from google import genai
from google.genai import types, errors

import time

from app.core.config import settings
from app.schemas.grading_extraction import GradingExtractionResult

EXTRACTION_MODEL = "gemini-3.6-flash"


class GradingCategoryExtractionService:

    def __init__(self) -> None:
        self.client = genai.Client(
            api_key=settings.GOOGLE_API_KEY
        )

    def extract_categories(self, text: str, course_context: str | None = None) -> GradingExtractionResult:
        prompt = f"""
Extract the grading breakdown (weighted categories) from the course syllabus below.

Course context:
{course_context or "Not provided"}

Course material:
{text}
"""
        max_attempts = 3

        for attempt in range(1, max_attempts + 1):

            try:
                response = self.client.models.generate_content(
                    model=EXTRACTION_MODEL,
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        temperature=0.0,
                        response_mime_type="application/json",
                        response_schema=GradingExtractionResult,
                        system_instruction=(

                            "You extract the grading breakdown from a course syllabus - the named "
                            "categories of graded work and the percentage weight each category "
                            "contributes to the final grade. Examples of categories: Homework, "
                            "Quizzes, Midterm Exam, Final Exam, Participation, Labs, Projects. "

                            "Only extract a category when the syllabus explicitly states a weight "
                            "percentage for it. "

                            "Do not invent, guess, or estimate a weight percentage that is not "
                            "explicitly stated in the provided text. "

                            "Do not extract individual assignments, due dates, or point totals - "
                            "only the named grading categories and their weight percentages. "

                            "Preserve the category name as closely as practical to the source "
                            "material. "

                            "If the syllabus contains no explicit grading breakdown with stated "
                            "weight percentages, return an empty categories list."
                        )
                    )
                )

                break
            except errors.APIError as e:
                if e.code not in (429, 503):
                    raise

                if attempt == max_attempts:
                    raise

                time.sleep(2**(attempt - 1))

        if not response.text:
            raise ValueError("Gemini returned an empty extraction response")

        result = GradingExtractionResult.model_validate_json(
            response.text
        )

        result.categories = [
            category
            for category in result.categories
            if category.weight_percent is not None
        ]

        return result
