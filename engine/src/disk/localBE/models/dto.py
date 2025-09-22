from dataclasses import dataclass
from typing import Optional


@dataclass
class DirectoryEntryDTO:
    name: str
    path: str
    isDir: bool
    sizeBytes: Optional[int]
    modifiedIso: str
    mimeType: Optional[str]


@dataclass
class FilePropertiesDTO:
    path: str
    name: str
    isDir: bool
    sizeBytes: Optional[int]
    modifiedIso: str
    createdIso: str
    mimeType: Optional[str]
    ext: Optional[str]



