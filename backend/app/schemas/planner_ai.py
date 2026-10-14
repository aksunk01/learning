from pydantic import BaseModel, Field


class SuggestedSubtask(BaseModel):
    title: str
    estimated_minutes: int


class SubtaskSuggestionResult(BaseModel):
    subtasks: list[SuggestedSubtask] = Field(default_factory=list)


class ItemExplanation(BaseModel):
    item_id: str
    explanation: str


class ExplanationBatchResult(BaseModel):
    explanations: list[ItemExplanation] = Field(default_factory=list)


class RecommendationPhrasing(BaseModel):
    explanation: str
