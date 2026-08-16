from google import genai
from google.genai import types, errors

import time

from app.core.config import settings
from app.schemas.assignment_extraction import AssignmentExtractionResult

EXTRACTION_MODEL = "gemini-3.5-flash"


class AssignmentExtractionService:

    def __init__(self) -> None:
        self.client = genai.Client(
            api_key=settings.GOOGLE_API_KEY
        )

    def extract_assignments(self, text: str, course_context: str | None = None) -> AssignmentExtractionResult:
        prompt = f"""
Extract assignments, projects, exams, quizzes, labs, papers, and other graded course work from the course material below.

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
                        response_schema=AssignmentExtractionResult,
                        system_instruction=(
                            "You extract structured academic assignment information from course materials. "
                            
                            "Extract assignments, homework, projects, exams, quizzes, labs, papers, and other "
                            "graded course work that is explicitly supported by the provided course material. "
                            
                            "Do not invent assignments, deadlines, points, grading weights, titles, or other facts. "
                            "If a field is not specified by the course material, return null for that field. "
                            
                            "Preserve the assignment title as closely as practical to the source material. "
                            "Use assignment_type values such as homework, project, exam, quiz, lab, paper, or other. "
                            
                            "For due_at, return a date and time only when the provided material and course context "
                            "contain enough information to determine it. "
                            "Do not guess a missing date or time. "
                            "When the original due-date wording exists, preserve that wording in raw_due_text. "
                            
                            "Each source block in the course material is labeled with a source identifier "
                            "such as [SOURCE_1], [SOURCE_2], or [SOURCE_3]. "
                            
                            "For every extracted assignment, return source_ids containing the integer IDs "
                            "of the source blocks that directly support the extracted assignment. "
                            "For example, information supported by [SOURCE_2] should use source_ids [2]. "
                            "Information supported by [SOURCE_1] and [SOURCE_3] should use source_ids [1, 3]. "
                            
                            "Only return source IDs that actually appear in the provided course material. "
                            "Never invent a source ID. "
                            "Use the smallest set of source IDs necessary to support the extracted assignment. "
                            
                            "Do not treat individual instructions, questions, subtasks, or numbered steps within "
                            "a single assignment as separate assignments unless the course material clearly identifies "
                            "them as independently assigned or graded work. "
                            "For example, sections 1.1, 1.2, and 1.3 of Homework 3 should normally remain part of "
                            "Homework 3 rather than becoming three separate assignments. "
                            
                            "If multiple source blocks describe different parts of the same assignment, combine them "
                            "into one assignment when they clearly belong to the same overall assignment. "
                            
                            "If the course material contains multiple genuinely separate assignments or graded items, "
                            "return each one separately. "
                            
                            "If the course material contains no assignments or graded work, return an empty "
                            "assignments list."
                        )
                    )
                )

                break
            except errors.APIError as e:
                if e.code not in (429,503):
                    raise

                if attempt == max_attempts:
                    raise

                time.sleep(2**(attempt -1))

        if not response.text:
            raise ValueError("Gemini returned an exmpty extraction response")

        return AssignmentExtractionResult.model_validate_json(
            response.text
        )
