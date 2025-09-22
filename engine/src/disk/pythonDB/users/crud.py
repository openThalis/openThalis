import uuid
from datetime import datetime, timezone
from sqlalchemy.future import select
from sqlalchemy import delete

from src.disk.pythonDB.core.db import AsyncSessionLocal
from src.disk.pythonDB.users import models

# ---------- User ----------
async def get_or_create_user(email: str):
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(models.User).where(models.User.email == email))
        user = result.scalar_one_or_none()
        current_time = datetime.now(timezone.utc)
        
        if not user:
            user = models.User(
                id=str(uuid.uuid4()), 
                email=email,
                last_access_at=current_time
            )
            session.add(user)
        else:
            user.last_access_at = current_time
            
        await session.commit()
        await session.refresh(user)
        return user

async def get_user(email: str):
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(models.User).where(models.User.email == email))
        return result.scalar_one_or_none()

async def create_new_user(email: str):
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(models.User).where(models.User.email == email))
        existing_user = result.scalar_one_or_none()
        
        if existing_user:
            raise ValueError(f"User with email {email} already exists")
        
        current_time = datetime.now(timezone.utc)
        user = models.User(
            id=str(uuid.uuid4()),
            email=email,
            last_access_at=current_time
        )
        session.add(user)
        await session.commit()
        await session.refresh(user)
        return user

async def get_all_users():
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(models.User).order_by(
                models.User.last_access_at.desc().nullslast(),
                models.User.created_at.desc()
            )
        )
        return result.scalars().all()

async def delete_user(email: str):
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(models.User).where(models.User.email == email))
        user = result.scalar_one_or_none()
        
        if not user:
            raise ValueError(f"User with email {email} does not exist")
        
        user_id = user.id
        
        from src.disk.pythonDB.services.chats import models as chat_models
        from src.disk.pythonDB.services.settings import models as settings_models
        from src.disk.pythonDB.services.eido import models as eido_models
        from src.disk.pythonDB.services.tasks import models as task_models
        from src.disk.pythonDB.services.aether import models as aether_models
        
        try:
            await session.execute(
                delete(chat_models.Message).where(
                    chat_models.Message.conversation_id.in_(
                        select(chat_models.Conversation.id).where(
                            chat_models.Conversation.user_id == user_id
                        )
                    )
                )
            )
            
            await session.execute(
                delete(chat_models.Conversation).where(
                    chat_models.Conversation.user_id == user_id
                )
            )
            
            await session.execute(
                delete(settings_models.Setting).where(
                    settings_models.Setting.user_id == user_id
                )
            )
            
            await session.execute(
                delete(eido_models.EidoSetting).where(
                    eido_models.EidoSetting.user_id == user_id
                )
            )
            
            await session.execute(
                delete(task_models.Task).where(
                    task_models.Task.user_id == user_id
                )
            )
            
            await session.execute(
                delete(aether_models.Program).where(
                    aether_models.Program.user_id == user_id
                )
            )
            
            await session.execute(
                delete(models.User).where(models.User.id == user_id)
            )
            
            await session.commit()
            return True
            
        except Exception as e:
            await session.rollback()
            raise Exception(f"Failed to delete user {email}: {str(e)}")

async def rename_user(old_email: str, new_email: str):
    async with AsyncSessionLocal() as session:
        # Check if old user exists
        result = await session.execute(select(models.User).where(models.User.email == old_email))
        user = result.scalar_one_or_none()
        
        if not user:
            raise ValueError(f"User with email {old_email} does not exist")
        
        # Check if new email already exists
        result = await session.execute(select(models.User).where(models.User.email == new_email))
        existing_user = result.scalar_one_or_none()
        
        if existing_user:
            raise ValueError(f"User with email {new_email} already exists")
        
        try:
            # Update the user's email
            user.email = new_email
            await session.commit()
            return True
            
        except Exception as e:
            await session.rollback()
            raise Exception(f"Failed to rename user from {old_email} to {new_email}: {str(e)}")