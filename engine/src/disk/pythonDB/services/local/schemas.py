from pydantic import BaseModel
from typing import Optional


class DirectoryEntryDTO(BaseModel):
    name: str
    path: str
    isDir: bool
    sizeBytes: Optional[int]
    modifiedIso: str
    mimeType: Optional[str]


class FilePropertiesDTO(BaseModel):
    path: str
    name: str
    isDir: bool
    sizeBytes: Optional[int]
    modifiedIso: str
    createdIso: str
    mimeType: Optional[str]
    ext: Optional[str]

