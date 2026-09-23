from datetime import datetime
from uuid import UUID

from pydantic import AliasPath, BaseModel, ConfigDict, field_validator, Field

class AssignmentUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    assignment_type: str | None = None
    due_at: datetime | None = None
    points: float | None = None
    weight_percent: float | None = None

    @field_validator("title")
    @classmethod
    def title_must_not_be_empty(cls, v: str | None) -> str | None:
        if v is not None:
            value = v.strip()

            if not value:
                raise ValueError("Title must not be blank or whitespace-only")
        
        return value
    
    @field_validator("points")
    @classmethod
    def points_must_not_be_negative(cls, v: float | None) -> float | None:
        if v is not None and v < 0:
            raise ValueError("Points must not be negative")
        return v
    
    @field_validator("weight_percent")
    @classmethod
    def weight_percent_must_be_between_0_and_100(cls, v: float | None) -> float | None:
        if v is not None and (v < 0 or v > 100):
            raise ValueError("Weight percent must be between 0 and 100 inclusive")
        return v

class AssignmentMaterialLink(BaseModel):
    material_id: UUID
    relationship_type: str = "reference"
    is_primary: bool = False

    model_config = ConfigDict(
        from_attributes=True
    )


class AssignmentMaterialsLinkRequest(BaseModel):
    materials: list[AssignmentMaterialLink]


class AssignmentMaterialUpdate(BaseModel):
    relationship_type: str | None = None
    is_primary: bool | None = None

    model_config = ConfigDict(
        from_attributes=True
    )


class AssignmentMaterialResponse(BaseModel):
    material_id: UUID
    name: str = Field(validation_alias=AliasPath("material", "name"))
    description: str | None = Field(validation_alias=AliasPath("material", "description"), default=None)
    material_type: str | None = Field(validation_alias=AliasPath("material", "material_type"), default=None)
    relationship_type: str
    is_primary: bool

    model_config = ConfigDict(
        from_attributes=True
    )


class AssignmentDetailResponse(BaseModel):
    id: UUID
    course_id: UUID
    material_id: UUID | None

    title: str
    description: str | None
    assignment_type: str | None

    due_at: datetime | None

    points: float | None
    weight_percent: float | None

    source_page: int | None
    source_slide: int | None
    source_section: str | None
    source_chunk_index: int | None

    extraction_metadata: dict | None
    
    is_completed: bool
    completed_at: datetime | None

    created_at: datetime
    updated_at: datetime
    
    linked_materials: list[AssignmentMaterialResponse] = Field(validation_alias="assignment_materials", default_factory=list)

    model_config = ConfigDict(
        from_attributes=True
    )


class AssignmentCreate(BaseModel):
    title: str
    description: str | None = None
    assignment_type: str | None = None
    due_at: datetime | None = None
    points: float | None = None
    weight_percent: float | None = None

    @field_validator("title")
    @classmethod
    def title_must_not_be_empty(cls, v: str) -> str:
        value = v.strip()

        if not value:
            raise ValueError("Title must not be blank or whitespace-only")
        
        return v
    
    @field_validator("points")
    @classmethod
    def points_must_not_be_negative(cls, v: float | None) -> float | None:
        if v is not None and v < 0:
            raise ValueError("Points must not be negative")
        return v
    
    @field_validator("weight_percent")
    @classmethod
    def weight_percent_must_be_between_0_and_100(cls, v: float | None) -> float | None:
        if v is not None and (v < 0 or v > 100):
            raise ValueError("Weight percent must be between 0 and 100 inclusive")
        return v

    model_config = ConfigDict(
        from_attributes=True
    )


class AssignmentCompletionUpdate(BaseModel):
    is_completed: bool


class AssignmentResponse(BaseModel):
    id: UUID
    course_id: UUID
    material_id: UUID | None

    title: str
    description: str | None
    assignment_type: str | None

    due_at: datetime | None

    points: float | None
    weight_percent: float | None

    source_page: int | None
    source_slide: int | None
    source_section: str | None
    source_chunk_index: int | None

    extraction_metadata: dict | None
    
    is_completed: bool
    completed_at: datetime | None

    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(
        from_attributes=True
    )
