import time

from google.genai import types, errors

from app.services.gemini_client_pool import GeminiClientPool
from app.schemas.planner_ai import (
    SubtaskSuggestionResult,
    ExplanationBatchResult,
    RecommendationPhrasing,
)

PLANNER_MODEL = "gemini-3.6-flash"

_MAX_ATTEMPTS = 3


class PlannerAIService:
    """LLM-backed helpers for the Planner feature.

    All calls here are optional polish on top of a fully deterministic
    scoring/allocation engine (see planner_engine.py) - callers should treat
    any exception from this service as recoverable and fall back to a
    deterministic string, never let it break the Planner endpoints.
    """

    def __init__(self) -> None:
        self.pool = GeminiClientPool()

    def _run_structured(self, prompt: str, system_instruction: str, response_schema, temperature: float = 0.2):
        def call(client):
            return client.models.generate_content(
                model=PLANNER_MODEL,
                contents=prompt,
                config=types.GenerateContentConfig(
                    temperature=temperature,
                    response_mime_type="application/json",
                    response_schema=response_schema,
                    system_instruction=system_instruction,
                ),
            )

        response = None

        for attempt in range(1, _MAX_ATTEMPTS + 1):
            try:
                response = self.pool.run(call)
                break
            except errors.APIError as e:
                if e.code not in (429, 503):
                    raise

                if attempt == _MAX_ATTEMPTS:
                    raise

                time.sleep(2 ** (attempt - 1))

        if not response.text:
            raise ValueError("Gemini returned an empty response")

        return response.text

    def suggest_subtasks(
        self,
        title: str,
        description: str | None,
        assignment_type: str | None,
        points: float | None,
        weight_percent: float | None,
        due_at_text: str | None,
        course_name: str,
    ) -> SubtaskSuggestionResult:
        prompt = f"""
Course: {course_name}
Assignment title: {title}
Assignment type: {assignment_type or "unspecified"}
Description: {description or "Not provided"}
Points: {points if points is not None else "unspecified"}
Weight: {weight_percent if weight_percent is not None else "unspecified"}%
Due: {due_at_text or "unspecified"}

Break this assignment down into an ordered list of concrete, actionable subtasks
a student could complete one at a time, each with a realistic estimated_minutes.
"""
        system_instruction = (
            "You help students break large academic assignments into concrete, ordered "
            "subtasks. For projects/papers/labs, use stages like reviewing requirements, "
            "designing the solution, implementing, testing, writing documentation, and "
            "final submission - adapted to what the assignment actually asks for. For "
            "exams or quizzes, propose specific study subtasks scoped to the course and "
            "assignment description (e.g. 'Review Chapter 4: Recursion') rather than a "
            "single generic 'Study for exam' task. Each subtask needs a short, specific "
            "title and a realistic estimated_minutes. The subtasks' estimated_minutes "
            "should sum to a plausible total effort for an assignment of this type and "
            "point/weight value. Order subtasks in the sequence a student should do them. "
            "Return between 3 and 8 subtasks. If there isn't enough information to break "
            "the assignment down meaningfully, return an empty list."
        )

        text = self._run_structured(prompt, system_instruction, SubtaskSuggestionResult)
        return SubtaskSuggestionResult.model_validate_json(text)

    def explain_selections(self, items_context: list[dict]) -> dict[str, str]:
        """items_context: list of {"item_id", "title", "course_name", "due_in_days",
        "estimated_minutes", "weight_percent", "priority_level"}. Returns a
        map of item_id -> short explanation string. Raises on failure - caller
        must catch and fall back to deterministic template text."""
        prompt = "Items to explain:\n" + "\n".join(
            f"- id={i['item_id']} title=\"{i['title']}\" course={i['course_name']} "
            f"due_in_days={i['due_in_days']} estimated_minutes={i['estimated_minutes']} "
            f"weight_percent={i['weight_percent']} priority_level={i['priority_level']}"
            for i in items_context
        )
        system_instruction = (
            "For each item, write one short (under 20 words) plain-language sentence "
            "explaining to a student why this task was selected/prioritized right now, "
            "referencing its due date, weight, or urgency as relevant. Return one "
            "explanation per item_id given, using the exact item_id values provided."
        )

        text = self._run_structured(prompt, system_instruction, ExplanationBatchResult, temperature=0.3)
        result = ExplanationBatchResult.model_validate_json(text)
        return {e.item_id: e.explanation for e in result.explanations}

    def phrase_recommendation(self, items_context: list[dict], available_minutes: int) -> str:
        prompt = (
            f"The student has {available_minutes} minutes available right now.\n"
            "Selected items:\n"
            + "\n".join(
                f"- \"{i['title']}\" ({i['course_name']}, ~{i['estimated_minutes']} min, "
                f"due_in_days={i['due_in_days']}, priority_level={i['priority_level']})"
                for i in items_context
            )
        )
        system_instruction = (
            "Write a short (2-3 sentence) recommendation to the student explaining what "
            "to work on given the selected items and their available time, and briefly "
            "why this combination makes sense right now."
        )

        text = self._run_structured(prompt, system_instruction, RecommendationPhrasing, temperature=0.3)
        result = RecommendationPhrasing.model_validate_json(text)
        return result.explanation
