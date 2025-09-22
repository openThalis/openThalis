import os
from urllib.parse import unquote


def normalize_input_path(raw_path: str) -> str:
    decoded = unquote(raw_path)
    return os.path.abspath(decoded)


def sanitize_relative_upload_path(name: str) -> str:
    name = name.replace("\\", "/")
    parts = [p for p in name.split("/") if p not in ("", ".", "..")]
    return os.path.join(*parts) if parts else ""


def ensure_under_directory(base_dir_abs: str, target_abs: str) -> bool:
    try:
        common = os.path.commonpath([base_dir_abs, target_abs])
    except ValueError:
        return False
    return common == os.path.abspath(base_dir_abs)


