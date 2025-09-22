from fastapi import APIRouter, HTTPException, Depends


from src.disk.pythonDB.core.security import get_current_user
from src.disk.pythonDB.services.chats.schemas import TitleUpdate, MessageUpdate, AddDirectMessage
from src.disk.pythonDB.services.chats.logic import ChatsService
from src.disk.pythonDB.utils.error_handlers import handle_service_error

router = APIRouter()
service = ChatsService()

# ---------------- Conversations ----------------
@router.get("/conversations")
async def get_conversations(current_user: str = Depends(get_current_user)):
    try:
        conversations = await service.get_conversations(current_user)
        return {"conversations": conversations}
    except Exception as e:
        handle_service_error(e)

@router.post("/conversations")
async def create_conversation(current_user: str = Depends(get_current_user)):
    try:
        conversation = await service.create_conversation(current_user)
        return {"conversation_id": conversation["id"]}
    except Exception as e:
        handle_service_error(e)

@router.get("/conversations/{conversation_id}")
async def get_conversation(conversation_id: str, current_user: str = Depends(get_current_user)):
    try:
        history = await service.get_conversation_history(conversation_id, current_user)
        return {"history": history}
    except Exception as e:
        handle_service_error(e)

@router.put("/conversations/{conversation_id}/title")
async def update_conversation_title(conversation_id: str, title_update: TitleUpdate, current_user: str = Depends(get_current_user)):
    try:
        # Allow hidden titles for system processes (like altar terminal)
        allow_hidden = title_update.title.startswith('hidden_chat_')
        success = await service.update_conversation_title(conversation_id, title_update.title, current_user, allow_hidden)
        if not success:
            raise HTTPException(status_code=404, detail="Conversation not found")
        return {"status": "success"}
    except HTTPException:
        raise
    except Exception as e:
        handle_service_error(e)

@router.delete("/conversations/{conversation_id}")
async def delete_conversation(conversation_id: str, current_user: str = Depends(get_current_user)):
    try:
        success = await service.delete_conversation(conversation_id, current_user)
        if not success:
            raise HTTPException(status_code=404, detail="Conversation not found or already deleted")
        return {"status": "success"}
    except HTTPException:
        raise
    except Exception as e:
        handle_service_error(e)

@router.post("/conversations/{conversation_id}/fork")
async def fork_conversation(conversation_id: str, current_user: str = Depends(get_current_user)):
    try:
        new_conversation = await service.fork_conversation(conversation_id, current_user)
        return {"conversation_id": new_conversation["id"]}
    except Exception as e:
        handle_service_error(e)

@router.post("/conversations/{conversation_id}/messages")
async def add_message(conversation_id: str, content: dict, current_user: str = Depends(get_current_user)):
    try:
        result = await service.process_message(content["content"], current_user, conversation_id)
        return result
    except Exception as e:
        handle_service_error(e)


# Add a single message directly (without AI processing)
@router.post("/conversations/{conversation_id}/messages/add")
async def add_message_direct(conversation_id: str, payload: AddDirectMessage, current_user: str = Depends(get_current_user)):
    try:
        added = await service.add_message_direct(conversation_id, payload.content, payload.role, current_user)
        if not added:
            raise HTTPException(status_code=404, detail="Conversation not found")
        return added
    except HTTPException:
        raise
    except Exception as e:
        handle_service_error(e)

# ---------------- Messages ----------------
@router.put("/messages/{message_id}")
async def update_message(message_id: str, message_update: MessageUpdate, current_user: str = Depends(get_current_user)):
    try:
        updated = await service.update_message(message_id, message_update.content, current_user)
        if not updated:
            raise HTTPException(status_code=404, detail="Message not found")
        return updated
    except HTTPException:
        raise
    except Exception as e:
        handle_service_error(e)

@router.delete("/messages/{message_id}")
async def delete_message(message_id: str, current_user: str = Depends(get_current_user)):
    try:
        success = await service.delete_message(message_id, current_user)
        if not success:
            raise HTTPException(status_code=404, detail="Message not found or already deleted")
        return {"status": "success"}
    except HTTPException:
        raise
    except Exception as e:
        handle_service_error(e) 