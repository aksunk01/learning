import re
from typing import Iterator
from uuid import UUID

from sqlalchemy.orm import Session
from app.api.v1.assignments import (
    current_wall_clock_time,
    query_overdue_assignments,
    query_upcoming_assignments,
)
from app.core.config import settings
from app.models.conversation import Conversation
from app.models.course import Course
from app.services.generation import GenerationService, TASK_SYSTEM_INSTRUCTION
from app.services.retrieval import RetrievalService

_MAX_HISTORY_MESSAGES = 10  # ~5 prior turns
_AUTO_DETECT_CANDIDATE_LIMIT = 15  # wider pool than the final context, used only for course voting
_STICKY_COURSE_MARGIN = 0.08  # how much closer a new course must be to override continuity
_MAX_TASK_ITEMS = 12  # keeps the planning-question prompt fast on the local model

# Words that mark a question as being about the user's schedule/workload
# rather than course content - these need a structured list of assignments
# and due dates, not a vector search over syllabus text.
_TASK_QUERY_KEYWORDS = {
    "due", "deadline", "deadlines", "overdue", "prioritize", "prioritise",
    "priority", "priorities", "upcoming", "homework", "assignments",
    "assignment", "todo", "schedule",
}

# Course-name words too generic to treat as a distinctive match on their own
# (e.g. "Automata Theory" vs "Computer Networking" both contain words from
# this list - only the non-generic word should identify the course).
_GENERIC_COURSE_WORDS = {
    "introduction", "introductory", "intro", "fundamentals", "fundamental",
    "principles", "principle", "advanced", "theory", "theories", "design",
    "systems", "system", "computer", "computers", "science", "engineering",
    "course", "college", "university", "general", "applied", "topics",
    "special", "independent", "study", "studies", "seminar", "workshop",
    "practicum", "laboratory", "lecture", "lab", "project", "projects",
}

class RAGService:
    def __init__(self) -> None:
        self.retrieval_service = RetrievalService()
        self.generation_service = GenerationService()

    def _get_sticky_course_id(self, conversation: Conversation | None) -> UUID | None:
        """Find the course the most recent assistant turn actually used, so a vague
        follow-up ("what about the grading?") can stay on-topic instead of
        re-detecting from scratch with no memory of what was just discussed."""
        if conversation is None:
            return None

        for message in reversed(conversation.messages):
            if message.role == "assistant" and message.sources:
                raw_course_id = message.sources[0].get("course_id")

                if raw_course_id:
                    try:
                        return UUID(raw_course_id)
                    except (ValueError, TypeError):
                        return None

                return None

        return None

    def _match_course_by_keyword(self, db: Session, user_id: UUID, question: str) -> UUID | None:
        """Vector similarity on generic syllabus text can be too noisy to tell
        two courses apart (midterm/schedule boilerplate reads the same
        everywhere). If the question explicitly names a course - by code, a
        distinctive word from its title, or a common acronym like "ai" for
        "Artificial Intelligence" - that textual signal is far stronger than
        an ambiguous vector match and should win outright. Returns the course
        id only when exactly one course matches, to avoid false confidence."""
        courses = db.query(Course).filter(Course.user_id == user_id).all()

        if not courses:
            return None

        question_lower = question.lower()
        question_words = set(re.findall(r"[a-z0-9]+", question_lower))
        question_compact = re.sub(r"\s+", "", question_lower)

        matched_course_ids: set[UUID] = set()

        for course in courses:
            name_words = re.findall(r"[a-zA-Z]+", course.name)
            code_digits = re.sub(r"[^0-9]", "", course.code or "")
            code_compact = re.sub(r"\s+", "", (course.code or "").lower())

            is_match = False

            if len(name_words) > 1:
                acronym = "".join(word[0] for word in name_words).lower()
                if len(acronym) >= 2 and acronym in question_words:
                    is_match = True

            if code_compact and len(code_compact) >= 3 and code_compact in question_compact:
                is_match = True

            if code_digits and len(code_digits) >= 3 and code_digits in question_words:
                is_match = True

            for word in name_words:
                word_lower = word.lower()
                if len(word_lower) >= 6 and word_lower not in _GENERIC_COURSE_WORDS and word_lower in question_words:
                    is_match = True

            if is_match:
                matched_course_ids.add(course.id)

        if len(matched_course_ids) == 1:
            return next(iter(matched_course_ids))

        return None

    def _is_task_query(self, question: str) -> bool:
        """Does this look like a question about the user's schedule/workload
        (what's due, what to prioritize) rather than course content? Those
        need a structured list of assignments and due dates pulled from the
        Assignment table, not a vector search over syllabus/lecture text."""
        words = set(re.findall(r"[a-z]+", question.lower()))
        return bool(words & _TASK_QUERY_KEYWORDS)

    def _build_task_context(self, db: Session, user_id: UUID, course_id: UUID | None = None) -> str | None:
        """Build a context string listing the user's overdue and upcoming
        assignments (course, type, due date, weight/points where known), each
        labeled [1], [2], ... so the model can cite which assignment it's
        talking about the same way it cites document sources.

        Capped to _MAX_TASK_ITEMS, closest to right now first (whether
        overdue or upcoming): a full semester's worth of tracked assignments
        is more text than the local generation model can handle quickly, and
        what's closest to now is what "what should I prioritize" questions
        actually care about anyway.
        """
        assignments = query_overdue_assignments(db=db, user_id=user_id) + query_upcoming_assignments(db=db, user_id=user_id)

        if course_id is not None:
            assignments = [a for a in assignments if a.course_id == course_id]

        if not assignments:
            return None

        now = current_wall_clock_time()

        assignments = sorted(
            assignments,
            key=lambda a: abs((a.due_at - now).total_seconds()) if a.due_at is not None else float("inf")
        )[:_MAX_TASK_ITEMS]

        lines: list[str] = []

        for source_id, assignment in enumerate(assignments, start=1):
            is_overdue = assignment.due_at is not None and assignment.due_at < now
            due_text = (
                assignment.due_at.strftime("%A, %B %d, %Y %I:%M %p")
                if assignment.due_at is not None
                else "no due date set"
            )

            details = [
                f"course: {assignment.course.code or assignment.course.name}",
                f"type: {assignment.assignment_type or 'unspecified'}",
                f"due: {due_text}{' (OVERDUE)' if is_overdue else ''}",
            ]

            if assignment.weight_percent is not None:
                details.append(f"weight: {assignment.weight_percent}% of course grade")

            if assignment.points is not None:
                details.append(f"points: {assignment.points}")

            if assignment.estimated_minutes is not None:
                details.append(f"estimated time: {assignment.estimated_minutes} minutes")

            lines.append(f"[{source_id}] {assignment.title} - " + ", ".join(details))

        return "\n".join(lines)

    def _build_context(self, db: Session, user_id: UUID, question: str, limit: int, course_id: UUID | None = None, conversation: Conversation | None = None):
        """Run retrieval and build the (context, sources, detected_course_id) tuple
        shared by ask and ask_stream.

        course_id given -> manual pin, scoped to that course only.
        course_id=None -> auto-detect. First checks whether the question
        explicitly names a course (see _match_course_by_keyword); if so that
        wins outright, since an explicit mention is a far stronger signal than
        vector similarity over generic syllabus text. Otherwise, pulls a
        wider candidate pool than the final context and picks the course with
        the most matching chunks (ties broken by closest distance) rather than
        just the single closest chunk's course, since one coincidental match in
        an unrelated course shouldn't win against a real cluster of relevant
        chunks elsewhere - this matters most for short/vague questions. If the
        conversation's last turn used a particular course and that course is
        still a reasonable match (within _STICKY_COURSE_MARGIN of the top
        vote), stick with it instead of switching, so vague follow-ups stay on
        the same course rather than re-detecting from zero each turn.
        """
        if course_id is not None:
            raw_results = self.retrieval_service.search_course(
                db=db,
                user_id=user_id,
                course_id=course_id,
                query=question,
                limit=limit
            )
            results = raw_results
            detected_course_id = course_id
        else:
            keyword_course_id = self._match_course_by_keyword(db, user_id, question)

            if keyword_course_id is not None:
                raw_results = self.retrieval_service.search_course(
                    db=db,
                    user_id=user_id,
                    course_id=keyword_course_id,
                    query=question,
                    limit=limit
                )
                results = raw_results
                detected_course_id = keyword_course_id
            else:
                raw_results = self.retrieval_service.search_user(
                    db=db,
                    user_id=user_id,
                    query=question,
                    limit=max(limit, _AUTO_DETECT_CANDIDATE_LIMIT)
                )

                if not raw_results:
                    return None, [], None

                course_stats: dict[UUID, dict] = {}

                for _, _, course, distance in raw_results:
                    stats = course_stats.setdefault(course.id, {"count": 0, "min_distance": distance})
                    stats["count"] += 1
                    stats["min_distance"] = min(stats["min_distance"], distance)

                best_course_id = min(
                    course_stats,
                    key=lambda cid: (-course_stats[cid]["count"], course_stats[cid]["min_distance"])
                )

                sticky_course_id = self._get_sticky_course_id(conversation)

                if (
                    sticky_course_id is not None
                    and sticky_course_id in course_stats
                    and sticky_course_id != best_course_id
                    and course_stats[sticky_course_id]["min_distance"] - course_stats[best_course_id]["min_distance"] <= _STICKY_COURSE_MARGIN
                ):
                    winning_course_id = sticky_course_id
                else:
                    winning_course_id = best_course_id

                results = [
                    (chunk, material, distance)
                    for chunk, material, course, distance in raw_results
                    if course.id == winning_course_id
                ][:limit]
                detected_course_id = winning_course_id

        if not results:
            return None, [], None

        context_parts: list[str] =[]
        sources: list[dict] = []

        for source_id, (chunk,material, distance) in enumerate(results, start=1):
            location_parts: list[str] = []

            if chunk.page_start is not None:
                if (chunk.page_end is not None and chunk.page_end != chunk.page_start):
                    location_parts.append(
                        f"pages {chunk.page_start}-{chunk.page_end}"
                    )
                else:
                    location_parts.append(
                        f"page {chunk.page_start}"
                    )
            if chunk.slide_number is not None:
                location_parts.append(
                    f"slide {chunk.slide_number}"
                )

            if chunk.section:
                location_parts.append(
                    f"section {chunk.section}"
                )

            location = (
                ", ".join(location_parts)
                if location_parts
                else "location not specified"
            )

            context_parts.append(
                f"""
[{source_id}]
Source: {material.file_name}, {location}

{chunk.content}
""".strip()
            )

            sources.append(
                {
                    "source_id": source_id,
                    "material_id": str(material.id),
                    "file_name": material.file_name,
                    "chunk_index": chunk.chunk_index,
                    "page_start": chunk.page_start,
                    "page_end": chunk.page_end,
                    "slide_number": chunk.slide_number,
                    "section": chunk.section,
                    "distance": float(distance),
                    "course_id": str(detected_course_id) if detected_course_id else None
                }
            )

        context = "\n\n---\n\n".join(context_parts)

        return context, sources, detected_course_id

    def _build_history_messages(self, conversation: Conversation | None, max_turns: int = _MAX_HISTORY_MESSAGES) -> list[dict]:
        """Convert conversation.messages (oldest -> newest) into {"role", "content"}
        dicts for GenerationService, capped to the last N messages. Excludes the
        current in-flight question, which the caller passes separately."""
        if conversation is None:
            return []

        return [
            {"role": message.role, "content": message.content}
            for message in conversation.messages[-max_turns:]
        ]

    def ask(self, db: Session, user_id: UUID, question: str, limit: int = 5, course_id: UUID | None = None, conversation: Conversation | None = None) -> dict:
        history = self._build_history_messages(conversation)

        if self._is_task_query(question):
            task_context = self._build_task_context(db, user_id, course_id)

            if task_context is None:
                return {
                    "answer": "You don't have any overdue or upcoming assignments tracked right now.",
                    "sources": [],
                    "course_id": course_id
                }

            answer = self.generation_service.generate_answer(
                question=question,
                context=task_context,
                history=history,
                system_instruction=TASK_SYSTEM_INSTRUCTION,
                model=settings.OLLAMA_TASK_MODEL or settings.OLLAMA_GENERATION_MODEL
            )

            return {
                "answer": answer,
                "sources": [],
                "course_id": course_id
            }

        context, sources, detected_course_id = self._build_context(db, user_id, question, limit, course_id, conversation)

        if context is None:
            return {
                "answer":"I could not find any relevant course material for this question",
                "sources": [],
                "course_id": None
            }

        answer = self.generation_service.generate_answer(
            question=question,
            context=context,
            history=history
        )

        return {
            "answer": answer,
            "sources": sources,
            "course_id": detected_course_id
        }

    def ask_stream(self, db: Session, user_id: UUID, question: str, limit: int = 5, course_id: UUID | None = None, conversation: Conversation | None = None) -> Iterator[dict]:
        """Yield {"type": "sources"|"token"|"done", ...} events as the answer is generated."""
        history = self._build_history_messages(conversation)

        if self._is_task_query(question):
            task_context = self._build_task_context(db, user_id, course_id)

            if task_context is None:
                yield {
                    "type": "answer",
                    "answer": "You don't have any overdue or upcoming assignments tracked right now.",
                    "sources": [],
                    "course_id": course_id
                }
                return

            yield {"type": "sources", "sources": [], "course_id": str(course_id) if course_id else None}

            for token in self.generation_service.stream_answer(
                question=question,
                context=task_context,
                history=history,
                system_instruction=TASK_SYSTEM_INSTRUCTION,
                model=settings.OLLAMA_TASK_MODEL or settings.OLLAMA_GENERATION_MODEL
            ):
                yield {"type": "token", "text": token}

            yield {"type": "done"}
            return

        context, sources, detected_course_id = self._build_context(db, user_id, question, limit, course_id, conversation)

        if context is None:
            yield {
                "type": "answer",
                "answer": "I could not find any relevant course material for this question",
                "sources": [],
                "course_id": None
            }
            return

        yield {"type": "sources", "sources": sources, "course_id": str(detected_course_id) if detected_course_id else None}

        for token in self.generation_service.stream_answer(question=question, context=context, history=history):
            yield {"type": "token", "text": token}

        yield {"type": "done"}
