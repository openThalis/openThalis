import os
from typing import Optional

from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.future import select

try:
    from src.disk.core.db import AsyncSessionLocal  # type: ignore
    from src.disk.services.settings import models as settings_models  # type: ignore
except Exception:
    # Allow module import even if DB layer is unavailable during certain startup flows
    AsyncSessionLocal = None  # type: ignore
    settings_models = None  # type: ignore


FRONTEND_DIR = os.path.dirname(os.path.dirname(__file__))


def _default_home() -> str:
    """Return a sensible default folder for the app to open.

    Prefer the user's Desktop directory when it exists, otherwise fall back
    to the user's home directory. Works across Windows/macOS/Linux.
    """
    home_dir = os.path.expanduser("~")
    desktop_dir = os.path.join(home_dir, "Desktop")
    try:
        if os.path.isdir(desktop_dir):
            return os.path.abspath(desktop_dir)
    except Exception:
        pass
    return os.path.abspath(home_dir)


# Default home path for the UI to open on startup
DEFAULT_HOME = _default_home()


async def _get_local_path_from_db() -> Optional[str]:
    """Attempt to read LOCAL_PATH (or local_path) from the settings table.

    If the DB is not ready or any error occurs, return None to allow fall-back.
    The function returns the raw string from DB without validation.
    """
    if AsyncSessionLocal is None or settings_models is None:
        return None
    try:
        async with AsyncSessionLocal() as session:  # type: ignore
            stmt = (
                select(settings_models.Setting)
                .where(settings_models.Setting.key_name.in_(["LOCAL_PATH", "local_path"]))
                .order_by(settings_models.Setting.updated_at.desc())
            )
            result = await session.execute(stmt)
            setting = result.scalars().first()
            if setting and setting.key_value:
                return str(setting.key_value)
    except SQLAlchemyError:
        return None
    except Exception:
        return None
    return None


async def resolve_home_path() -> str:
    """Resolve the home path for Local UI.

    Preference order:
    1) LOCAL_PATH from DB settings (latest), if it exists and is a readable directory
    2) DEFAULT_HOME computed from the current user environment
    """
    candidate = await _get_local_path_from_db()
    if candidate:
        try:
            candidate_abs = os.path.abspath(candidate)
            if os.path.isdir(candidate_abs) and os.access(candidate_abs, os.R_OK):
                return candidate_abs
        except Exception as e:
            print(f"Error {e} resolving home path: {candidate}")
    return DEFAULT_HOME


# Streaming and upload tunables
CHUNK_SIZE = 102 * 1024  # 102 KiB


