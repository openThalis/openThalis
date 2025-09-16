import uuid
from typing import Dict, List, Optional, Any, Set

from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.future import select

from src.disk.pythonDB.core.db import AsyncSessionLocal
from src.disk.pythonDB.services.eido import models
from src.disk.pythonDB.users.crud import get_or_create_user


RESERVED_EIDO_KEYS: Set[str] = {
    # Session
    'OPERATOR_NAME', 'PURPOSE',
    # Provider
    'PROVIDER_NAME', 'MODEL_NAME', 'MODEL_MAX_TOKENS', 'MODEL_TEMPERATURE',
    # Agents
    'DEFAULT_AGENT',
    # Modes
    'AGENTS_MODE', 'AWARENESS_MODE', 'TOOLS_MODE', 'LOCAL_MODE',
}


async def get_user_eido_settings(email: str) -> List[Dict[str, Any]]:
    """Get all eido settings for a user"""
    async with AsyncSessionLocal() as session:
        try:
            user = await get_or_create_user(email)
            result = await session.execute(
                select(models.EidoSetting).where(models.EidoSetting.user_id == user.id)
            )
            settings = result.scalars().all()
            return [
                {
                    'id': setting.id,
                    'key_name': setting.key_name,
                    'key_value': setting.key_value,
                    'created_at': setting.created_at.isoformat(),
                    'updated_at': setting.updated_at.isoformat(),
                }
                for setting in settings
            ]
        except SQLAlchemyError as e:
            print(f"Error getting eido settings: {e}")
            return []


async def get_eido_settings_dict(email: str) -> Dict[str, Any]:
    """Get eido settings as a normalized dictionary.
    Returns reserved keys as-is and nests dynamic agents under 'agents'.
    """
    settings = await get_user_eido_settings(email)
    result: Dict[str, Any] = {}

    # Collect reserved keys and find agents if present
    agents_obj: Dict[str, str] = {}
    found_agents_dict: Optional[Dict[str, Any]] = None

    for s in settings:
        k = s.get('key_name')
        v = s.get('key_value')
        if k == 'agents' and isinstance(v, dict):
            found_agents_dict = v
        elif k in RESERVED_EIDO_KEYS:
            # Normalize None to '' for scalar fields; keep dicts as-is
            result[k] = v if v is not None else ''

    if found_agents_dict is not None:
        # Ensure all values are strings
        agents_obj = {str(name): ('' if val is None else str(val)) for name, val in found_agents_dict.items()}

    result['agents'] = agents_obj
    return result


async def update_user_eido_settings(email: str, settings_dict: Dict[str, Any]) -> bool:
    """Update or create multiple eido settings for a user.
    Accepts nested dictionaries (e.g., 'agents': { name: prompt }).
    """
    async with AsyncSessionLocal() as session:
        try:
            user = await get_or_create_user(email)

            # Get existing settings
            result = await session.execute(
                select(models.EidoSetting).where(models.EidoSetting.user_id == user.id)
            )
            existing_settings = {setting.key_name: setting for setting in result.scalars().all()}

            # Update or create settings
            # Handle agents nested dict
            incoming_agents: Dict[str, str] = {}
            if 'agents' in settings_dict and isinstance(settings_dict['agents'], dict):
                for name, prompt in settings_dict['agents'].items():
                    incoming_agents[str(name)] = '' if prompt is None else str(prompt)

            # Upsert reserved keys
            for key_name, key_value in settings_dict.items():
                if key_name == 'agents' or key_name not in RESERVED_EIDO_KEYS:
                    continue
                if key_name in existing_settings:
                    existing_settings[key_name].key_value = '' if key_value is None else str(key_value)
                else:
                    session.add(models.EidoSetting(
                        id=str(uuid.uuid4()),
                        user_id=user.id,
                        key_name=key_name,
                        key_value='' if key_value is None else str(key_value),
                    ))

            # Upsert agents
            if incoming_agents:
                if 'agents' in existing_settings and isinstance(existing_settings['agents'].key_value, dict):
                    existing_settings['agents'].key_value = dict(incoming_agents)
                elif 'agents' in existing_settings:
                    # Convert non-dict to dict
                    existing_settings['agents'].key_value = dict(incoming_agents)
                else:
                    session.add(models.EidoSetting(
                        id=str(uuid.uuid4()),
                        user_id=user.id,
                        key_name='agents',
                        key_value=dict(incoming_agents),
                    ))

            await session.commit()
            return True
        except SQLAlchemyError as e:
            print(f"Error updating eido settings: {e}")
            await session.rollback()
            return False


async def delete_user_eido_settings(email: str) -> bool:
    """Delete all eido settings for a user (reset functionality)"""
    async with AsyncSessionLocal() as session:
        try:
            user = await get_or_create_user(email)
            result = await session.execute(
                select(models.EidoSetting).where(models.EidoSetting.user_id == user.id)
            )
            settings = result.scalars().all()

            for setting in settings:
                await session.delete(setting)

            await session.commit()
            return True
        except SQLAlchemyError as e:
            print(f"Error deleting eido settings: {e}")
            await session.rollback()
            return False


async def create_eido_setting(email: str, key_name: str, key_value: Any) -> Optional[Dict[str, Any]]:
    """Create or update a single eido setting"""
    async with AsyncSessionLocal() as session:
        try:
            user = await get_or_create_user(email)

            # Check if setting already exists
            result = await session.execute(
                select(models.EidoSetting).where(
                    models.EidoSetting.user_id == user.id,
                    models.EidoSetting.key_name == key_name,
                )
            )
            existing_setting = result.scalar_one_or_none()

            if existing_setting:
                existing_setting.key_value = key_value
                setting = existing_setting
            else:
                setting = models.EidoSetting(
                    id=str(uuid.uuid4()),
                    user_id=user.id,
                    key_name=key_name,
                    key_value=key_value,
                )
                session.add(setting)

            await session.commit()
            return {
                'id': setting.id,
                'key_name': setting.key_name,
                'key_value': setting.key_value,
                'created_at': setting.created_at.isoformat(),
                'updated_at': setting.updated_at.isoformat(),
            }
        except SQLAlchemyError as e:
            print(f"Error creating eido setting: {e}")
            await session.rollback()
            return None



async def delete_eido_setting(email: str, key_name: str) -> bool:
    """Delete a single eido setting for a user by key name"""
    async with AsyncSessionLocal() as session:
        try:
            user = await get_or_create_user(email)
            result = await session.execute(
                select(models.EidoSetting).where(
                    models.EidoSetting.user_id == user.id,
                    models.EidoSetting.key_name == key_name,
                )
            )
            setting = result.scalar_one_or_none()
            if not setting:
                return True  # nothing to delete, treat as success
            await session.delete(setting)
            await session.commit()
            return True
        except SQLAlchemyError as e:
            print(f"Error deleting eido setting '{key_name}': {e}")
            await session.rollback()
            return False





async def delete_agent_entry(email: str, agent_key: str) -> bool:
    """Delete a single agent (key) from the nested 'agents' dictionary for a user."""
    async with AsyncSessionLocal() as session:
        try:
            user = await get_or_create_user(email)
            result = await session.execute(
                select(models.EidoSetting).where(models.EidoSetting.user_id == user.id)
            )
            existing = {s.key_name: s for s in result.scalars().all()}

            agents_setting = existing.get('agents')
            if agents_setting and isinstance(agents_setting.key_value, dict):
                agents_dict = dict(agents_setting.key_value)
                if agent_key in agents_dict:
                    agents_dict.pop(agent_key, None)
                    agents_setting.key_value = agents_dict
                    await session.commit()
            return True
        except SQLAlchemyError as e:
            print(f"Error deleting agent entry '{agent_key}': {e}")
            await session.rollback()
            return False


