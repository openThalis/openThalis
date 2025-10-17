from fastapi import WebSocket, WebSocketDisconnect
from typing import Dict

class WebSocketManager:
    def __init__(self):
        self.active_connections: Dict[str, dict] = {}

    async def connect(self, websocket: WebSocket, client_id: str, email: str):
        try:
            await websocket.accept()
            self.active_connections[client_id] = {"websocket": websocket, "email": email}
        except Exception as e:
            print(f"Error accepting connection: {e}")
            raise

    def disconnect(self, client_id: str):
        if client_id in self.active_connections:
            del self.active_connections[client_id]

    async def send_message(self, client_id: str, message: dict):
        if client_id in self.active_connections:
            try:
                await self.active_connections[client_id]["websocket"].send_json(message)
            except Exception as e:
                print(f"Error sending message: {e}")
                await self.disconnect(client_id)

    async def send_to_user(self, email: str, message: dict):
        disconnected_clients = []
        for client_id, connection in list(self.active_connections.items()):
            if connection["email"] == email:
                try:
                    await connection["websocket"].send_json(message)
                except Exception as e:
                    print(f"Error sending to user {email} (client {client_id}): {e}")
                    disconnected_clients.append(client_id)
        
        # Clean up disconnected clients
        for client_id in disconnected_clients:
            self.disconnect(client_id)

    async def handle_connection(self, websocket: WebSocket, client_id: str, service, email: str):
        try:
            await self.connect(websocket, client_id, email)
            
            while True:
                try:
                    data = await websocket.receive_json()
                    
                    if data.get("type") == "message":
                        response_data = await service.process_message(
                            data.get("content", ""),
                            email,
                            data.get("conversation_id")
                        )
                        
                        # Send user message confirmation first
                        user_message_id = response_data.get("user_message_id")
                        conversation_id = response_data.get("conversation_id") or data.get("conversation_id")
                        assistant_messages = response_data.get("assistant_messages", [])
                        
                        # Send each assistant message as a separate response
                        for i, assistant_msg in enumerate(assistant_messages):
                            await self.send_message(client_id, {
                                "type": "response",
                                "content": assistant_msg.get("content"),
                                "user_message_id": user_message_id if i == 0 else None,  # Only include user_message_id in first response
                                "assistant_message_id": assistant_msg.get("id"),
                                "conversation_id": conversation_id
                            })
                    elif data.get("type") == "artifact":
                        await self.send_message(client_id, {
                            "type": "artifact",
                            "artifactType": data.get("artifactType", "default"),
                            "content": data.get("content", {})
                        })
                except WebSocketDisconnect:
                    break
                except Exception as e:
                    print(f"Error handling message: {e}")
                    await self.send_message(client_id, {
                        "type": "error",
                        "content": str(e)
                    })
        except Exception as e:
            print(f"Connection error: {e}")
        finally:
            self.disconnect(client_id) 