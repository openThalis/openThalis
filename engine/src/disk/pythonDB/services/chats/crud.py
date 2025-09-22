
import uuid
from sqlalchemy.future import select
from sqlalchemy import delete
from datetime import datetime, timezone


from src.disk.pythonDB.core.db import AsyncSessionLocal
from src.disk.pythonDB.services.chats import models
from src.disk.pythonDB.users.crud import get_or_create_user


def _iso_utc(dt):
    if dt is None:
        return None
    # Ensure timezone-aware in UTC
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    else:
        dt = dt.astimezone(timezone.utc)
    return dt.isoformat()

# ---------- Conversation ----------
async def create_conversation(email: str):
    async with AsyncSessionLocal() as session:
        user = await get_or_create_user(email)
        conversation = models.Conversation(
            id=str(uuid.uuid4()),
            user_id=user.id,
            title=datetime.now().strftime("%d-%m-%Y - %H:%M:%S")
        )
        session.add(conversation)
        await session.commit()
        return {
            'id': conversation.id,
            'email': email,
            'created_at': _iso_utc(conversation.created_at),
            'title': conversation.title
        }

async def get_conversation(conversation_id: str, email: str):
    async with AsyncSessionLocal() as session:
        user = await get_or_create_user(email)
        result = await session.execute(
            select(models.Conversation).where(
                models.Conversation.id == conversation_id,
                models.Conversation.user_id == user.id
            )
        )
        conv = result.scalar_one_or_none()
        if conv:
            return {
                'id': conv.id,
                'email': email,
                'created_at': _iso_utc(conv.created_at),
                'title': conv.title
            }
        return None

async def get_conversations(email: str):
    async with AsyncSessionLocal() as session:
        user = await get_or_create_user(email)
        result = await session.execute(
            select(models.Conversation).where(models.Conversation.user_id == user.id).order_by(models.Conversation.created_at.desc())
        )
        conversations = result.scalars().all()
        return [{
            'id': conv.id,
            'email': email,
            'created_at': _iso_utc(conv.created_at),
            'title': conv.title
        } for conv in conversations]

async def update_conversation_title(conversation_id: str, title: str, email: str, allow_hidden: bool = False):
    async with AsyncSessionLocal() as session:
        user = await get_or_create_user(email)
        result = await session.execute(
            select(models.Conversation).where(
                models.Conversation.id == conversation_id,
                models.Conversation.user_id == user.id
            )
        )
        conversation = result.scalar_one_or_none()
        if conversation:
            # Prevent users from setting titles that start with 'hidden_chat_' unless explicitly allowed
            if title.startswith('hidden_chat_') and not allow_hidden:
                raise ValueError("Titles starting with 'hidden_chat_' are reserved and cannot be used")
            conversation.title = title
            await session.commit()
            return True
        return False

async def delete_conversation(conversation_id: str, email: str):
    async with AsyncSessionLocal() as session:
        user = await get_or_create_user(email)
        result = await session.execute(
            select(models.Conversation).where(
                models.Conversation.id == conversation_id,
                models.Conversation.user_id == user.id
            )
        )
        conversation = result.scalar_one_or_none()
        if conversation:
            # First delete all messages associated with this conversation (bulk delete)
            await session.execute(
                delete(models.Message).where(models.Message.conversation_id == conversation_id)
            )
            
            # Then delete the conversation itself
            await session.delete(conversation)
            await session.commit()
            return True
        return False

async def fork_conversation(conversation_id: str, email: str):
    async with AsyncSessionLocal() as session:
        # Get original conversation
        result = await session.execute(select(models.Conversation).where(models.Conversation.id == conversation_id))
        original = result.scalar_one_or_none()
        if not original:
            raise ValueError("Original conversation not found")
        user = await get_or_create_user(email)
        new_conv = models.Conversation(id=str(uuid.uuid4()), user_id=user.id, title=f"Fork of {original.title}")
        session.add(new_conv)

        # Copy messages
        result = await session.execute(
            select(models.Message).where(models.Message.conversation_id == conversation_id).order_by(models.Message.created_at)
        )
        msgs = result.scalars().all()
        for msg in msgs:
            session.add(models.Message(
                id=str(uuid.uuid4()),
                conversation_id=new_conv.id,
                content=msg.content,
                sender=msg.sender
            ))
        await session.commit()
        return {
            'id': new_conv.id,
            'email': email,
            'created_at': _iso_utc(new_conv.created_at),
            'title': new_conv.title
        }

# ---------- Message ----------
async def add_message(conversation_id: str, content: str, role: str, email: str):
    if not content or not content.strip():
        raise ValueError("Message content cannot be empty or whitespace-only")
    
    async with AsyncSessionLocal() as session:
        _ = await get_or_create_user(email)
        message = models.Message(id=str(uuid.uuid4()), conversation_id=conversation_id, content=content.strip(), sender=role)
        session.add(message)
        await session.commit()
        return {
            'id': message.id,
            'conversation_id': message.conversation_id,
            'content': message.content,
            'role': message.sender,
            'created_at': _iso_utc(message.created_at)
        }

async def get_conversation_history(conversation_id: str, email: str):
    async with AsyncSessionLocal() as session:
        _ = await get_or_create_user(email)
        result = await session.execute(select(models.Message).where(models.Message.conversation_id == conversation_id).order_by(models.Message.created_at))
        messages = result.scalars().all()
        return [{
            'id': m.id,
            'conversation_id': m.conversation_id,
            'content': m.content,
            'role': m.sender,
            'created_at': _iso_utc(m.created_at)
        } for m in messages]

async def update_message(message_id: str, content: str, email: str):
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(models.Message).join(models.Conversation).join(models.User).where(
                models.Message.id == message_id,
                models.User.email == email
            )
        )
        message = result.scalar_one_or_none()
        if message:
            message.content = content
            await session.commit()
            return {
                'id': message.id,
                'conversation_id': message.conversation_id,
                'content': message.content,
                'role': message.sender,
                'created_at': _iso_utc(message.created_at)
            }
        return None

async def delete_message(message_id: str, email: str):
    async with AsyncSessionLocal() as session:
        # First verify the user exists and get their ID
        user = await get_or_create_user(email)
        
        # Find the message and verify ownership through conversation
        result = await session.execute(
            select(models.Message).join(models.Conversation).where(
                models.Message.id == message_id,
                models.Conversation.user_id == user.id
            )
        )
        message = result.scalar_one_or_none()
        if message:
            await session.delete(message)
            await session.commit()
            return True
        return False 

########################################

async def clear_conversation_messages(email, conversation_id):
    async with AsyncSessionLocal() as session:
        # First verify the user owns the conversation
        user = await get_or_create_user(email)
        result = await session.execute(
            select(models.Conversation).where(
                models.Conversation.id == conversation_id,
                models.Conversation.user_id == user.id
            )
        )
        conversation = result.scalar_one_or_none()
        
        if not conversation:
            return False  # Conversation not found or user doesn't have access
        
        # Delete all messages in the conversation (bulk delete)
        result = await session.execute(
            delete(models.Message).where(models.Message.conversation_id == conversation_id)
        )
        await session.commit()
        
        return True  # Successfully cleared messages