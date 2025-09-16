import os
import string
from typing import List, Dict


def list_drives() -> List[str]:
    drives: list[str] = []
    if os.name == "nt":
        for d in string.ascii_uppercase:
            root = f"{d}:{os.sep}"
            try:
                if os.path.exists(root):
                    drives.append(root)
            except Exception:
                continue
    else:
        drives.append(os.path.abspath(os.sep))
    return drives


def known_folders() -> list[dict[str, str]]:
    items: list[dict[str, str]] = []
    home = os.path.expanduser("~")
    candidates: Dict[str, str] = {
        "Home": home,
        "Desktop": os.path.join(home, "Desktop"),
        "Documents": os.path.join(home, "Documents"),
        "Downloads": os.path.join(home, "Downloads"),
        "Pictures": os.path.join(home, "Pictures"),
        "Music": os.path.join(home, "Music"),
        "Videos": os.path.join(home, "Videos"),
    }
    for name, path in candidates.items():
        try:
            if os.path.exists(path):
                items.append({"name": name, "path": os.path.abspath(path)})
        except Exception:
            continue
    return items


