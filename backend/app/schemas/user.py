from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr

class UserResponse(BaseModel):
    id: UUID
    email: str
    created_at: datetime

class UserCreate(BaseModel):
    email: EmailStr
    password: str

class UserRead(BaseModel):
    id: UUID
    email: EmailStr


    class Config:
        from_attributes = True