from src.disk.services.chats import crud

from src.api.thalisAPI import thalisAPI

class ChatsService:
    
    async def create_conversation(self, email: str):
        return await crud.create_conversation(email)

    async def get_conversations(self, email: str):
        return await crud.get_conversations(email)

    async def get_conversation_history(self, conversation_id: str, email: str):
        return await crud.get_conversation_history(conversation_id, email)

    async def update_conversation_title(self, conversation_id: str, title: str, email: str, allow_hidden: bool = False):
        return await crud.update_conversation_title(conversation_id, title, email, allow_hidden)

    async def process_message(self, content: str, email: str, conversation_id: str = None) -> dict:
        try:
            if not conversation_id:
                conversation = await self.create_conversation(email)
                conversation_id = conversation['id']
            else:
                existing = await crud.get_conversation(conversation_id, email)
                if not existing:
                    # For altar terminal requests, we want to preserve the conversation ID if possible
                    # Check if this is an altar conversation by trying to create with the same ID
                    if conversation_id:
                        try:
                            from src.disk.services.chats import models
                            from src.disk.core.db import AsyncSessionLocal
                            
                            async with AsyncSessionLocal() as session:
                                user = await crud.get_or_create_user(email)
                                
                                conversation = models.Conversation(
                                    id=conversation_id,
                                    user_id=user.id,
                                    title="hidden_chat_altar"
                                )
                                session.add(conversation)
                                await session.commit()
                                
                        except Exception:
                            conversation = await self.create_conversation(email)
                            conversation_id = conversation['id']
                    else:
                        conversation = await self.create_conversation(email)
                        conversation_id = conversation['id']

            history_before = await crud.get_conversation_history(conversation_id, email)
            before_count = len(history_before)

            api = thalisAPI(email)
            result = await api.process(content, conversation_id)

            history_after = await crud.get_conversation_history(conversation_id, email)
            
            new_messages = history_after[before_count:] if len(history_after) > before_count else []
            
            user_message_id = None
            assistant_messages = []
            
            for msg in new_messages:
                if msg.get('role') == 'user' and not user_message_id:
                    user_message_id = msg.get('id')
                elif msg.get('role') == 'assistant':
                    assistant_messages.append({
                        'id': msg.get('id'),
                        'content': msg.get('content', '')
                    })

            if not assistant_messages and isinstance(result, dict):
                assistant_messages = [{
                    'id': None,
                    'content': result.get('response', '')
                }]

            return {
                'user_message_id': user_message_id,
                'assistant_messages': assistant_messages,
                'conversation_id': conversation_id
            }
        except Exception as e:
            print(f'Error processing message: {e}')
            try:
                saved_user = await crud.add_message(conversation_id, content, 'user', email)
            except Exception:
                saved_user = {'id': None}
            return {
                'user_message_id': saved_user.get('id'),
                'assistant_messages': [{
                    'id': None,
                    'content': 'An error occurred while generating a response.'
                }],
                'conversation_id': conversation_id
            }

    async def update_message(self, message_id: str, content: str, email: str):
        return await crud.update_message(message_id, content, email)

    async def delete_message(self, message_id: str, email: str):
        return await crud.delete_message(message_id, email)

    async def delete_conversation(self, conversation_id: str, email: str):
        return await crud.delete_conversation(conversation_id, email)

    async def fork_conversation(self, conversation_id: str, email: str):
        return await crud.fork_conversation(conversation_id, email) 

    async def add_message_direct(self, conversation_id: str, content: str, role: str, email: str):
        if role not in ('user', 'assistant', 'system'):
            raise ValueError('Invalid role for message')
        return await crud.add_message(conversation_id, content, role, email)