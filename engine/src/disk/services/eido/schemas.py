from typing import Dict, Any

from pydantic import BaseModel


class EidoSettingResponse(BaseModel):
    id: str
    key_name: str
    key_value: Any
    created_at: str
    updated_at: str


class EidoSettingsUpdateRequest(BaseModel):
    settings: Dict[str, Any]


class EidoSettingCreateRequest(BaseModel):
    key_name: str
    key_value: str





