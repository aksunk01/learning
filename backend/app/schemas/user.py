from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field

class UserResponse(BaseModel):
    id: UUID
    email: str
    display_name: str | None = None
    dashboard_layout: str
    favorite_semester_id: UUID | None = None
    created_at: datetime

class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=255)

class UserRead(BaseModel):
    id: UUID
    email: EmailStr


    class Config:
        from_attributes = True

class UserUpdate(BaseModel):
    display_name: str | None = Field(default=None, max_length=100)
    dashboard_layout: Literal["standard", "compact", "board", "kanban"] | None = None
    favorite_semester_id: UUID | None = None

class PasswordChange(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8, max_length=255)
