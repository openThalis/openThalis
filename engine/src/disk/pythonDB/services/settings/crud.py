import uuid
from sqlalchemy.future import select
from sqlalchemy.exc import SQLAlchemyError
from typing import Dict, List, Optional

from src.disk.pythonDB.core.db import AsyncSessionLocal
from src.disk.pythonDB.services.settings import models
from src.disk.pythonDB.users.crud import get_or_create_user

async def get_user_settings(email: str) -> List[Dict]:
    async with AsyncSessionLocal() as session:
        try:
            user = await get_or_create_user(email)
            result = await session.execute(
                select(models.Setting).where(models.Setting.user_id == user.id)
            )
            settings = result.scalars().all()
            return [{
                'id': setting.id,
                'key_name': setting.key_name,
                'key_value': setting.key_value or '',
                'created_at': setting.created_at.isoformat(),
                'updated_at': setting.updated_at.isoformat()
            } for setting in settings]
        except SQLAlchemyError as e:
            print(f"Error getting user settings: {e}")
            return []

async def get_settings_dict(email: str) -> Dict[str, str]:
    settings = await get_user_settings(email)
    return {setting['key_name']: setting['key_value'] for setting in settings}

async def update_user_settings(email: str, settings_dict: Dict[str, str]) -> bool:
    async with AsyncSessionLocal() as session:
        try:
            user = await get_or_create_user(email)
            
            # Get existing settings
            result = await session.execute(
                select(models.Setting).where(models.Setting.user_id == user.id)
            )
            existing_settings = {setting.key_name: setting for setting in result.scalars().all()}
            
            # Update or create settings
            for key_name, key_value in settings_dict.items():
                if key_name in existing_settings:
                    # Update existing setting
                    existing_settings[key_name].key_value = key_value
                else:
                    # Create new setting
                    new_setting = models.Setting(
                        id=str(uuid.uuid4()),
                        user_id=user.id,
                        key_name=key_name,
                        key_value=key_value
                    )
                    session.add(new_setting)
            
            await session.commit()
            return True
        except SQLAlchemyError as e:
            print(f"Error updating user settings: {e}")
            await session.rollback()
            return False

async def delete_user_settings(email: str) -> bool:
    async with AsyncSessionLocal() as session:
        try:
            user = await get_or_create_user(email)
            result = await session.execute(
                select(models.Setting).where(models.Setting.user_id == user.id)
            )
            settings = result.scalars().all()
            
            for setting in settings:
                await session.delete(setting)
            
            await session.commit()
            return True
        except SQLAlchemyError as e:
            print(f"Error deleting user settings: {e}")
            await session.rollback()
            return False

async def delete_setting(email: str, key_name: str) -> bool:
    async with AsyncSessionLocal() as session:
        try:
            user = await get_or_create_user(email)
            result = await session.execute(
                select(models.Setting).where(
                    models.Setting.user_id == user.id,
                    models.Setting.key_name == key_name
                )
            )
            setting = result.scalar_one_or_none()
            if not setting:
                return True  # nothing to delete, treat as success
            await session.delete(setting)
            await session.commit()
            return True
        except SQLAlchemyError as e:
            print(f"Error deleting setting '{key_name}': {e}")
            await session.rollback()
            return False

async def create_setting(email: str, key_name: str, key_value: str) -> Optional[Dict]:
    async with AsyncSessionLocal() as session:
        try:
            user = await get_or_create_user(email)
            
            # Check if setting already exists
            result = await session.execute(
                select(models.Setting).where(
                    models.Setting.user_id == user.id,
                    models.Setting.key_name == key_name
                )
            )
            existing_setting = result.scalar_one_or_none()
            
            if existing_setting:
                # Update existing
                existing_setting.key_value = key_value
                setting = existing_setting
            else:
                # Create new
                setting = models.Setting(
                    id=str(uuid.uuid4()),
                    user_id=user.id,
                    key_name=key_name,
                    key_value=key_value
                )
                session.add(setting)
            
            await session.commit()
            return {
                'id': setting.id,
                'key_name': setting.key_name,
                'key_value': setting.key_value,
                'created_at': setting.created_at.isoformat(),
                'updated_at': setting.updated_at.isoformat()
            }
        except SQLAlchemyError as e:
            print(f"Error creating setting: {e}")
            await session.rollback()
            return None

async def rename_setting(email: str, old_key_name: str, new_key_name: str) -> bool:
    async with AsyncSessionLocal() as session:
        try:
            user = await get_or_create_user(email)
            # Check destination doesn't already exist
            result_new = await session.execute(
                select(models.Setting).where(
                    models.Setting.user_id == user.id,
                    models.Setting.key_name == new_key_name
                )
            )
            existing_new = result_new.scalar_one_or_none()
            if existing_new is not None:
                return False

            # Find source
            result_old = await session.execute(
                select(models.Setting).where(
                    models.Setting.user_id == user.id,
                    models.Setting.key_name == old_key_name
                )
            )
            setting = result_old.scalar_one_or_none()
            if setting is None:
                return False

            setting.key_name = new_key_name
            await session.commit()
            return True
        except SQLAlchemyError as e:
            print(f"Error renaming setting '{old_key_name}' -> '{new_key_name}': {e}")
            await session.rollback()
            return False
