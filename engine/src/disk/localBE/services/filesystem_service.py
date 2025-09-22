import os
import time
import shutil
from typing import Dict, List, Optional, Tuple

from src.disk.localBE.models.dto import DirectoryEntryDTO, FilePropertiesDTO
from src.disk.localBE.models import errors as E
from src.disk.localBE.services.mime_service import guess_mime_type


def serialize_dir_entry(dir_entry: os.DirEntry) -> DirectoryEntryDTO:
    try:
        stat_result = dir_entry.stat(follow_symlinks=False)
    except Exception:
        stat_result = None  # type: ignore[assignment]

    try:
        is_dir = dir_entry.is_dir(follow_symlinks=False)
    except Exception:
        is_dir = False

    size_bytes: Optional[int] = None
    if not is_dir and stat_result is not None:
        size_bytes = int(getattr(stat_result, "st_size", 0))

    modified_epoch: Optional[float] = None
    if stat_result is not None:
        modified_epoch = float(getattr(stat_result, "st_mtime", 0.0))

    mime_type = guess_mime_type(dir_entry.path) if not is_dir else None

    return DirectoryEntryDTO(
        name=dir_entry.name,
        path=os.path.abspath(dir_entry.path),
        isDir=is_dir,
        sizeBytes=size_bytes,
        modifiedIso=time.strftime("%Y-%m-%dT%H:%M:%S", time.localtime(modified_epoch or 0.0)),
        mimeType=mime_type,
    )


def list_directory(path: str) -> list[Dict[str, object]]:
    try:
        entries: List[Dict[str, object]] = []
        with os.scandir(path) as it:
            for entry in it:
                dto = serialize_dir_entry(entry)
                entries.append({
                    "name": dto.name,
                    "path": dto.path,
                    "isDir": dto.isDir,
                    "sizeBytes": dto.sizeBytes,
                    "modifiedIso": dto.modifiedIso,
                    "mimeType": dto.mimeType,
                })
    except FileNotFoundError:
        raise E.NotFoundError(f"Path not found: {path}")
    except NotADirectoryError:
        raise E.NotDirectoryError(f"Not a directory: {path}")
    except PermissionError:
        raise E.PermissionDeniedError(f"Permission denied: {path}")
    except OSError as exc:
        raise E.InvalidInputError(f"OS error: {exc}")

    entries.sort(key=lambda e: (not bool(e.get("isDir")), str(e.get("name", "")).lower()))
    return entries


def file_properties(abspath: str) -> FilePropertiesDTO:
    if not os.path.exists(abspath):
        raise E.NotFoundError("Path not found")
    try:
        st = os.stat(abspath)
        is_dir = os.path.isdir(abspath)
        mime_type = None if is_dir else guess_mime_type(abspath)
        return FilePropertiesDTO(
            path=abspath,
            name=os.path.basename(abspath) or abspath,
            isDir=is_dir,
            sizeBytes=None if is_dir else int(getattr(st, "st_size", 0)),
            modifiedIso=time.strftime("%Y-%m-%dT%H:%M:%S", time.localtime(getattr(st, "st_mtime", 0.0))),
            createdIso=time.strftime("%Y-%m-%dT%H:%M:%S", time.localtime(getattr(st, "st_ctime", 0.0))),
            mimeType=mime_type,
            ext=None if is_dir else os.path.splitext(abspath)[1].lstrip("."),
        )
    except PermissionError:
        raise E.PermissionDeniedError("Permission denied")
    except OSError as exc:
        raise E.InvalidInputError(f"OS error: {exc}")


def mkdir(parent_abs: str, name: str) -> str:
    target = os.path.join(parent_abs, name)
    try:
        os.makedirs(target, exist_ok=False)
    except FileExistsError:
        raise E.AlreadyExistsError("Already exists")
    except FileNotFoundError:
        raise E.NotFoundError("Parent path not found")
    except PermissionError:
        raise E.PermissionDeniedError("Permission denied")
    except OSError as exc:
        raise E.InvalidInputError(f"OS error: {exc}")
    return os.path.abspath(target)


def newfile(parent_abs: str, name: str) -> str:
    target = os.path.join(parent_abs, name)
    try:
        if not os.path.isdir(parent_abs):
            raise E.NotFoundError("Parent path not found")
        with open(target, "xb"):
            pass
    except FileExistsError:
        raise E.AlreadyExistsError("Already exists")
    except FileNotFoundError:
        raise E.NotFoundError("Parent path not found")
    except PermissionError:
        raise E.PermissionDeniedError("Permission denied")
    except OSError as exc:
        raise E.InvalidInputError(f"OS error: {exc}")
    return os.path.abspath(target)


def rename(src_abs: str, dst_abs: str) -> tuple[str, str]:
    try:
        os.replace(src_abs, dst_abs)
    except FileNotFoundError:
        raise E.NotFoundError("Source not found")
    except PermissionError:
        raise E.PermissionDeniedError("Permission denied")
    except OSError as exc:
        raise E.InvalidInputError(f"OS error: {exc}")
    return os.path.abspath(src_abs), os.path.abspath(dst_abs)


def delete_path(target_abs: str) -> str:
    if not os.path.exists(target_abs):
        raise E.NotFoundError("Path not found")
    try:
        if os.path.isdir(target_abs):
            shutil.rmtree(target_abs)
        else:
            os.remove(target_abs)
    except PermissionError:
        raise E.PermissionDeniedError("Permission denied")
    except OSError as exc:
        raise E.InvalidInputError(f"OS error: {exc}")
    return os.path.abspath(target_abs)


