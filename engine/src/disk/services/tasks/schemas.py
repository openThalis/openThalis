from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class TaskBase(BaseModel):
    title: str = Field(..., max_length=255)
    description: str = Field(..., min_length=2)
    assigned_agent: Optional[str] = Field(None, max_length=255)
    schedule_summary: Optional[str] = None
    running_status: bool = Field(True)
    responses: Optional[List[Dict[str, Any]]] = Field(default_factory=list)



class TaskCreate(TaskBase):
    pass


class TaskUpdate(BaseModel):
    title: Optional[str] = Field(None, max_length=255)
    description: Optional[str] = None
    assigned_agent: Optional[str] = Field(None, max_length=255)
    schedule_summary: Optional[str] = None
    running_status: Optional[bool] = None
    responses: Optional[List[Dict[str, Any]]] = None



 


