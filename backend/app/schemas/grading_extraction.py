
from pydantic import BaseModel, Field


class ExtractedGradingCategory(BaseModel):
    name: str
    weight_percent: float | None = None


class GradingExtractionResult(BaseModel):
    categories: list[ExtractedGradingCategory] = Field(default_factory=list)
