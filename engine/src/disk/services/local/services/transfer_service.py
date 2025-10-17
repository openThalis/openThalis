import os
import shutil
from typing import List

from src.disk.services.local import errors as E


def _generate_copy_path(original_path: str, dest_dir_path: str) -> str:
    base = os.path.basename(original_path)
    name, ext = os.path.splitext(base)
    candidate = os.path.join(dest_dir_path, f"{name} - Copy{ext}")
    i = 2
    while os.path.exists(candidate):
        candidate = os.path.join(dest_dir_path, f"{name} - Copy ({i}){ext}")
        i += 1
    return candidate


def copy_items(sources: List[str], dest_dir: str, overwrite: bool) -> list[dict[str, str]]:
    if not os.path.isdir(dest_dir):
        raise E.InvalidInputError("Destination must be a directory")
    results: list[dict[str, str]] = []
    for src in sources:
        src_abs = os.path.abspath(src)
        if not os.path.exists(src_abs):
            raise E.NotFoundError(f"Source not found: {src_abs}")
        base = os.path.basename(src_abs)
        dst_abs = os.path.join(dest_dir, base)
        try:
            src_abs_norm = os.path.normcase(os.path.abspath(src_abs))
            dst_abs_norm = os.path.normcase(os.path.abspath(dst_abs))
            if src_abs_norm == dst_abs_norm:
                dst_abs = _generate_copy_path(src_abs, os.path.dirname(src_abs))
            elif os.path.exists(dst_abs):
                if overwrite:
                    if os.path.isdir(dst_abs):
                        shutil.rmtree(dst_abs)
                    else:
                        os.remove(dst_abs)
                else:
                    dst_abs = _generate_copy_path(src_abs, dest_dir)

            if os.path.isdir(src_abs):
                shutil.copytree(src_abs, dst_abs, dirs_exist_ok=False)
            else:
                shutil.copy2(src_abs, dst_abs)
            results.append({"from": src_abs, "to": os.path.abspath(dst_abs)})
        except PermissionError:
            raise E.PermissionDeniedError(f"Permission denied copying {src_abs}")
        except OSError as exc:
            raise E.InvalidInputError(f"OS error copying {src_abs}: {exc}")
    return results


def move_items(sources: List[str], dest_dir: str, overwrite: bool) -> list[dict[str, str]]:
    if not os.path.isdir(dest_dir):
        raise E.InvalidInputError("Destination must be a directory")
    results: list[dict[str, str]] = []
    for src in sources:
        src_abs = os.path.abspath(src)
        if not os.path.exists(src_abs):
            raise E.NotFoundError(f"Source not found: {src_abs}")
        base = os.path.basename(src_abs)
        dst_abs = os.path.join(dest_dir, base)
        try:
            if os.path.normcase(os.path.abspath(src_abs)) == os.path.normcase(os.path.abspath(dst_abs)):
                results.append({"from": src_abs, "to": os.path.abspath(dst_abs)})
                continue
            if os.path.exists(dst_abs):
                if not overwrite:
                    raise E.ConflictError(f"Target exists: {dst_abs}")
                if os.path.isdir(dst_abs):
                    shutil.rmtree(dst_abs)
                else:
                    os.remove(dst_abs)
            shutil.move(src_abs, dst_abs)
            results.append({"from": src_abs, "to": os.path.abspath(dst_abs)})
        except PermissionError:
            raise E.PermissionDeniedError(f"Permission denied moving {src_abs}")
        except OSError as exc:
            raise E.InvalidInputError(f"OS error moving {src_abs}: {exc}")
    return results


