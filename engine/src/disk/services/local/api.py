from __future__ import annotations

import os
from typing import List, Optional

from fastapi import APIRouter, HTTPException, UploadFile, File, Query, Body, Header
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse
import mimetypes

from src.disk.services.local.config import resolve_home_path
from src.disk.services.local.services.system_service import list_drives, known_folders
from src.disk.services.local.services.filesystem_service import (
    list_directory,
    file_properties,
    mkdir as svc_mkdir,
    newfile as svc_newfile,
    rename as svc_rename,
    delete_path as svc_delete,
)
from src.disk.services.local.services.path_service import (
    normalize_input_path,
    sanitize_relative_upload_path,
    ensure_under_directory,
)
from src.disk.services.local.services.transfer_service import copy_items, move_items
from src.disk.services.local import errors as E


router = APIRouter()


def _raise_http_from_domain(exc: Exception):
    if isinstance(exc, E.NotFoundError):
        raise HTTPException(status_code=404, detail=str(exc) or "Not found")
    if isinstance(exc, E.NotDirectoryError):
        raise HTTPException(status_code=400, detail=str(exc) or "Not a directory")
    if isinstance(exc, E.PermissionDeniedError):
        raise HTTPException(status_code=403, detail=str(exc) or "Permission denied")
    if isinstance(exc, E.AlreadyExistsError):
        raise HTTPException(status_code=400, detail=str(exc) or "Already exists")
    if isinstance(exc, E.ConflictError):
        raise HTTPException(status_code=400, detail=str(exc))
    if isinstance(exc, E.InvalidInputError):
        raise HTTPException(status_code=400, detail=str(exc) or "Invalid input")
    raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/home")
async def get_home():
    home = await resolve_home_path()
    return {"homePath": home}


@router.get("/drives")
async def get_drives():
    return {"drives": list_drives()}


@router.get("/knownfolders")
async def get_known_folders():
    return {"items": known_folders()}


@router.get("/listdir")
async def listdir(path: str = Query(...), q: Optional[str] = Query(None)):
    try:
        abspath = normalize_input_path(path)
        entries = list_directory(abspath)
        if q:
            q_lower = str(q).lower()
            entries = [e for e in entries if str(e.get("name", "")).lower().find(q_lower) != -1]
        return {"path": abspath, "entries": entries}
    except Exception as exc:
        _raise_http_from_domain(exc)


@router.get("/raw")
async def raw(path: str = Query(...), range: str | None = Header(default=None, convert_underscores=False)):
    try:
        file_path = normalize_input_path(path)
        if not os.path.exists(file_path) or not os.path.isfile(file_path):
            raise E.NotFoundError("File not found")

        file_size = os.path.getsize(file_path)
        content_type = mimetypes.guess_type(file_path)[0] or "application/octet-stream"

        # If a Range header is provided, serve partial content
        if range and range.startswith("bytes="):
            # Parse Range header (single range only)
            range_spec = range.replace("bytes=", "").strip()
            start_str, _, end_str = range_spec.partition("-")
            try:
                start = int(start_str) if start_str else 0
                end = int(end_str) if end_str else (file_size - 1)
            except ValueError:
                # Invalid range; return full file response
                return FileResponse(file_path, media_type=content_type, headers={"Accept-Ranges": "bytes"})

            # Clamp values
            start = max(0, start)
            end = min(file_size - 1, end)
            if start > end:
                start, end = 0, file_size - 1

            chunk_size = 1024 * 1024

            def iter_file_range(fp: str, start_pos: int, end_pos: int, chunk: int):
                with open(fp, "rb") as f:
                    f.seek(start_pos)
                    bytes_remaining = end_pos - start_pos + 1
                    while bytes_remaining > 0:
                        to_read = min(chunk, bytes_remaining)
                        data = f.read(to_read)
                        if not data:
                            break
                        bytes_remaining -= len(data)
                        yield data

            headers = {
                "Content-Range": f"bytes {start}-{end}/{file_size}",
                "Accept-Ranges": "bytes",
                "Content-Length": str(end - start + 1),
            }

            return StreamingResponse(
                iter_file_range(file_path, start, end, chunk_size),
                status_code=206,
                media_type=content_type,
                headers=headers,
            )

        # No Range header: return full file with Accept-Ranges
        return FileResponse(file_path, media_type=content_type, headers={"Accept-Ranges": "bytes"})
    except Exception as exc:
        _raise_http_from_domain(exc)


@router.get("/properties")
async def properties(path: str = Query(...)):
    try:
        abspath = normalize_input_path(path)
        props = file_properties(abspath)
        return {
            "path": props.path,
            "name": props.name,
            "isDir": props.isDir,
            "sizeBytes": props.sizeBytes,
            "modifiedIso": props.modifiedIso,
            "createdIso": props.createdIso,
            "mimeType": props.mimeType,
            "ext": props.ext,
        }
    except Exception as exc:
        _raise_http_from_domain(exc)


@router.post("/mkdir")
async def mkdir(path: str = Body(...), name: str = Body(...)):
    try:
        parent_abs = normalize_input_path(str(path))
        created = svc_mkdir(parent_abs, str(name))
        return {"ok": True, "created": created}
    except Exception as exc:
        _raise_http_from_domain(exc)


@router.post("/newfile")
async def newfile(path: str = Body(...), name: str = Body(...)):
    try:
        parent_abs = normalize_input_path(str(path))
        created = svc_newfile(parent_abs, str(name))
        return {"ok": True, "created": created}
    except Exception as exc:
        _raise_http_from_domain(exc)


@router.post("/rename")
async def rename(
    path: str = Body(...),
    newName: Optional[str] = Body(None),
    newPath: Optional[str] = Body(None),
):
    try:
        if not path or (not newName and not newPath):
            raise E.InvalidInputError("Missing 'path' and 'newName' or 'newPath'")
        src_abs = normalize_input_path(str(path))
        if newPath:
            dst_abs = normalize_input_path(str(newPath))
        else:
            parent = os.path.dirname(src_abs)
            dst_abs = os.path.join(parent, str(newName))
        src_out, dst_out = svc_rename(src_abs, dst_abs)
        return {"ok": True, "from": src_out, "to": dst_out}
    except Exception as exc:
        _raise_http_from_domain(exc)


@router.post("/delete")
async def delete(path: str = Body(..., embed=True)):
    try:
        target_abs = normalize_input_path(str(path))
        deleted = svc_delete(target_abs)
        return {"ok": True, "deleted": deleted}
    except Exception as exc:
        _raise_http_from_domain(exc)


@router.post("/copy")
async def copy(
    sources: List[str] = Body(...),
    destination: str = Body(...),
    overwrite: bool = Body(False),
):
    try:
        if not sources or not destination:
            raise E.InvalidInputError("Missing 'sources' or 'destination'")
        dest_dir = normalize_input_path(str(destination))
        results = copy_items([normalize_input_path(str(s)) for s in sources], dest_dir, bool(overwrite))
        return {"ok": True, "copied": results}
    except Exception as exc:
        _raise_http_from_domain(exc)


@router.post("/move")
async def move(
    sources: List[str] = Body(...),
    destination: str = Body(...),
    overwrite: bool = Body(False),
):
    try:
        if not sources or not destination:
            raise E.InvalidInputError("Missing 'sources' or 'destination'")
        dest_dir = normalize_input_path(str(destination))
        results = move_items([normalize_input_path(str(s)) for s in sources], dest_dir, bool(overwrite))
        return {"ok": True, "moved": results}
    except Exception as exc:
        _raise_http_from_domain(exc)


@router.post("/upload")
async def upload(path: str = Query(...), file: List[UploadFile] = File(...)):
    try:
        if not path:
            raise E.InvalidInputError("Missing destination 'path' query parameter")
        dest_dir = normalize_input_path(path)
        if not os.path.isdir(dest_dir):
            raise E.InvalidInputError("Destination is not a directory")

        saved: List[str] = []
        dest_dir_abs = os.path.abspath(dest_dir)
        for item in file:
            raw_name = str(item.filename or "")
            rel_name = sanitize_relative_upload_path(raw_name)
            if not rel_name:
                continue
            out_path = os.path.join(dest_dir, rel_name)
            out_path_abs = os.path.abspath(out_path)
            if os.path.exists(out_path_abs):
                raise E.AlreadyExistsError("Already exists")
            if not ensure_under_directory(dest_dir_abs, out_path_abs):
                raise E.InvalidInputError("Invalid upload path")
            out_dir = os.path.dirname(out_path_abs)
            os.makedirs(out_dir, exist_ok=True)
            # Save file content
            data = await item.read()
            with open(out_path_abs, "wb") as out:
                out.write(data)
            saved.append(out_path_abs)

        return {"ok": True, "saved": saved}
    except Exception as exc:
        _raise_http_from_domain(exc)


@router.post("/write")
async def write_file(path: str = Body(...), content: str = Body(...)):
    try:
        if not path:
            raise E.InvalidInputError("Missing 'path' parameter")
        file_abs = normalize_input_path(str(path))
        
        # Ensure parent directory exists
        parent_dir = os.path.dirname(file_abs)
        if not os.path.exists(parent_dir):
            raise E.NotFoundError("Parent directory not found")
        if not os.path.isdir(parent_dir):
            raise E.NotDirectoryError("Parent path is not a directory")
        
        # Write content to file (overwrites existing file)
        with open(file_abs, "w", encoding="utf-8") as f:
            f.write(str(content))
        
        return {"ok": True, "written": file_abs}
    except Exception as exc:
        _raise_http_from_domain(exc)


