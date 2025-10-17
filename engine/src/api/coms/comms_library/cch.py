


async def cch(email, conversation_id):
    """Clear conversation history"""
    try:
        from src.disk.services.chats.crud import clear_conversation_messages
        success = await clear_conversation_messages(email, conversation_id)

        from src.api.server.server import thalisServer
        server = thalisServer.get_instance()
        

        await server.ws_manager.send_to_user(email, {
            "type": "clear_chat",
            "conversation_id": conversation_id
        })
        
        if success:
            return {
                "status": "success",
                "message": f"All messages cleared from conversation {conversation_id}"
            }
        else:
            return {
                "status": "error", 
                "message": "Conversation not found or access denied"
            }
    except Exception as e:
        return {
            "status": "error",
            "message": f"Failed to clear conversation: {str(e)}"
        }