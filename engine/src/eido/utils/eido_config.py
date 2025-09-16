from typing import Optional, Dict, Any

from src.disk.pythonDB.services.eido import crud as eido_crud
from src.disk.pythonDB.services.settings import crud as settings_crud


EIDO_KEY_MAP: Dict[str, str] = {
    # Session
    "operator_name": "OPERATOR_NAME",
    "eido_purpose": "PURPOSE",
    # Provider
    "provider_name": "PROVIDER_NAME",
    "model_name": "MODEL_NAME",
    "model_max_tokens": "MODEL_MAX_TOKENS",
    "model_temperature": "MODEL_TEMPERATURE",
    # Agents
    "default_agent": "DEFAULT_AGENT",
    # Modes
    "agents_mode": "AGENTS_MODE",
    "awareness_mode": "AWARENESS_MODE",
    "tools_mode": "TOOLS_MODE",
    "local_mode": "LOCAL_MODE",
}

async def _get_eido_settings_dict(email: Optional[str]) -> Dict[str, Any]:
    if not email:
        return {}
    try:
        return await eido_crud.get_eido_settings_dict(email)
    except Exception as e:
        print(f"Error fetching eido settings for {email}: {e}")
        return {}

async def fetch_eido_value(key: str, email: Optional[str] = None) -> str:
    mapped_key = EIDO_KEY_MAP.get(key)
    if not mapped_key:
        return ""
    settings = await _get_eido_settings_dict(email)
    return settings.get(mapped_key, "")

async def fetch_agents_dict(email: Optional[str] = None) -> Dict[str, str]:
    settings = await _get_eido_settings_dict(email)
    agents = settings.get('agents')
    if isinstance(agents, dict):
        # Ensure values are strings
        return {str(k): '' if v is None else str(v) for k, v in agents.items()}
    return {}


########################################################################

async def fetch_operator_name(email: Optional[str] = None) -> str:
    return await fetch_eido_value("operator_name", email=email)

async def fetch_eido_purpose(email: Optional[str] = None) -> str:
    return await fetch_eido_value("eido_purpose", email=email)

########################################################################

async def fetch_provider_name(email: Optional[str] = None) -> str:
    return await fetch_eido_value("provider_name", email=email)

async def fetch_model_name(email: Optional[str] = None) -> str:
    return await fetch_eido_value("model_name", email=email)

async def fetch_model_max_tokens(email: Optional[str] = None) -> str:
    return await fetch_eido_value("model_max_tokens", email=email)

async def fetch_model_temperature(email: Optional[str] = None) -> str:
    return await fetch_eido_value("model_temperature", email=email)

########################################################################

async def fetch_default_agent(email: Optional[str] = None) -> str:
    return await fetch_eido_value("default_agent", email=email)

########################################################################


async def fetch_agents_mode(email: Optional[str] = None) -> str:
    return await fetch_eido_value("agents_mode", email=email)

async def fetch_awareness_mode(email: Optional[str] = None) -> str:
    return await fetch_eido_value("awareness_mode", email=email)

async def fetch_tools_mode(email: Optional[str] = None) -> str:
    return await fetch_eido_value("tools_mode", email=email)

async def fetch_local_mode(email: Optional[str] = None) -> str:
    return await fetch_eido_value("local_mode", email=email)


########################################################################
########################################################################

SETTINGS_KEY_MAP: Dict[str, str] = {
    "local_path": "LOCAL_PATH"
}

async def _get_settings_dict(email: Optional[str]) -> Dict[str, str]:
    if not email:
        return {}
    try:
        return await settings_crud.get_settings_dict(email)
    except Exception as e:
        print(f"Error fetching settings for {email}: {e}")
        return {}

async def fetch_settings_value(key: str, email: Optional[str] = None) -> str:
    mapped_key = SETTINGS_KEY_MAP.get(key)
    if not mapped_key:
        return ""
    settings = await _get_settings_dict(email)
    return settings.get(mapped_key, "")

async def fetch_local_path(email: Optional[str] = None) -> str:
    return await fetch_settings_value("local_path", email=email)