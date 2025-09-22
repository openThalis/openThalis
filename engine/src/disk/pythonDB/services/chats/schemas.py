from pydantic import BaseModel

class TitleUpdate(BaseModel):
    title: str

class MessageUpdate(BaseModel):
    content: str 


class AddDirectMessage(BaseModel):
    content: str
    role: str  # Expected values: 'user', 'assistant', or 'system'