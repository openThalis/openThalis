from typing import Optional, Dict, Any
from pydantic import BaseModel, Field


class ProgramBase(BaseModel):
    name: str = Field(..., max_length=255, min_length=1)
    description: str = Field(..., max_length=10000, min_length=1)
    source_code: Optional[Dict[str, str]] = None
    status: str = Field(default='update', max_length=15)
    feedback: Optional[str] = None


class ProgramCreate(ProgramBase):
    pass


class ProgramUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=255, min_length=1)
    description: Optional[str] = Field(None, max_length=10000, min_length=1)
    source_code: Optional[Dict[str, str]] = None
    status: Optional[str] = Field(None, max_length=50)
    feedback: Optional[str] = None


class ProgramResponse(ProgramBase):
    id: str
    user_id: str
    created_at: str
    updated_at: str

