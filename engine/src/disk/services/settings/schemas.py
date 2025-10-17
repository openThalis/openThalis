from pydantic import BaseModel
from typing import Dict, Optional

class SettingResponse(BaseModel):
    id: str
    key_name: str
    key_value: str
    created_at: str
    updated_at: str

class SettingsUpdateRequest(BaseModel):
    settings: Dict[str, str]  # Dict of key_name -> key_value

class SettingCreateRequest(BaseModel):
    key_name: str
    key_value: str

class SettingRenameRequest(BaseModel):
    old_key_name: str
    new_key_name: str