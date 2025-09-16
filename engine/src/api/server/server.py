import fastapi
import uvicorn
import logging
from contextlib import asynccontextmanager
from multiprocessing.synchronize import Event as EventType

from fastapi import WebSocket, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse


from src.disk.pythonDB.core.security import verify_websocket_token
from src.disk.pythonDB.core.config import settings
from src.disk.pythonDB.core.db import init_db

# Import pythonDB routers and services
from src.disk.pythonDB.services.auth import router as auth_router
from src.disk.pythonDB.services.chats.api import router as chat_router
from src.disk.pythonDB.services.chats.logic import ChatsService
from src.disk.pythonDB.services.settings.api import router as settings_router
from src.disk.pythonDB.services.eido.api import router as eido_router
from src.disk.pythonDB.services.tasks.api import router as tasks_router
from src.disk.pythonDB.services.aether.api import router as aether_router
from src.disk.pythonDB.utils.websocket_manager import WebSocketManager

# Import localBE router
from src.disk.localBE.localeBE_router import router as localbe_router

# Global server instance (to be replaced with dependency injection)
SERVER_INSTANCE = None

# Dependency provider for server instance
def get_server_instance() -> 'thalisServer':
    if SERVER_INSTANCE is None:
        raise RuntimeError("Server instance not initialized")
    return SERVER_INSTANCE  

@asynccontextmanager
async def lifespan(app: fastapi.FastAPI):
    await init_db()
    
    if app.state.stop_event:
        if isinstance(app.state.stop_event, EventType):
            pass
        elif callable(app.state.stop_event):
            app.state.stop_event()
    yield
    # Shutdown: Clean up WebSockets and queues
    if SERVER_INSTANCE:
        # WebSocket cleanup removed - no longer managing connections
        pass

class thalisServer:
    def __init__(self, host, port):
        global SERVER_INSTANCE
        print(f"Initializing Thalis server on {host}:{port}")
        
        self.host = host
        self.port = port
        
       
        # Set global instance early to prevent race conditions
        SERVER_INSTANCE = self
        
        # Initialize FastAPI app with lifespan
        self.app = fastapi.FastAPI(title="Thalis Unified API", lifespan=lifespan)
        self.app.state.stop_event = None
        
        # Initialize services
        self.ws_manager = WebSocketManager()
        self.chat_service = ChatsService()
        
        # Setup middleware and routes
        self.setup_middleware()
        self.setup_routes()
        
        print("Thalis server initialization completed")

    @classmethod
    def get_instance(cls) -> 'thalisServer':
        if SERVER_INSTANCE is None:
            raise RuntimeError("Server instance not initialized")
        return SERVER_INSTANCE

    def setup_middleware(self):
        # CORS middleware (unified for both engine and pythonDB)
        self.app.add_middleware(
            CORSMiddleware,
            # Reflect whatever Origin the browser sends for development
            allow_origins=[],              # leave list empty when using origin_regex
            allow_origin_regex=".*",      # reflect any origin (dev-only)
            allow_credentials=True,
            allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
            allow_headers=["Authorization", "Content-Type", "Accept", "X-Requested-With"],
            expose_headers=["*"],
        )

    def setup_routes(self):
        # Create API router for pythonDB routes
        api_router = APIRouter()
        
        # Include pythonDB service routers
        api_router.include_router(auth_router, prefix="/auth", tags=["auth"])
        api_router.include_router(chat_router, tags=["chat"])
        api_router.include_router(settings_router, tags=["settings"])
        api_router.include_router(eido_router, tags=["eido"])
        api_router.include_router(tasks_router, tags=["tasks"])
        api_router.include_router(aether_router, tags=["aether"])
        api_router.include_router(localbe_router, tags=["local"])
        
        # Unified config endpoint
        @api_router.get("/config")
        async def get_api_config():
            config = {
                "backend_url": settings.backend_url or f"http://{self.host}:{self.port}",
                "ws_url": f"ws://{self.host}:{self.port}"
            }

            # Only include agent config if it exists
            if settings.default_agent_name:
                config["DEFAULT_AGENT_NAME"] = settings.default_agent_name
            if settings.default_system_prompt:
                config["DEFAULT_SYSTEM_PROMPT"] = settings.default_system_prompt

            # Only include model config if it exists
            if settings.model_max_tokens is not None:
                config["MODEL_MAX_TOKENS"] = settings.model_max_tokens
            if settings.model_temperature is not None:
                config["MODEL_TEMPERATURE"] = settings.model_temperature

            return config
        
        # Include API router with /api prefix for pythonDB routes
        self.app.include_router(api_router, prefix="/api")
        
        # ENGINE ROUTES (existing functionality)
        @self.app.get("/")
        async def root():
            return {"status": "Thalis Unified Server", "engine": "alive", "api": "alive"}

        @self.app.get("/ping_server")
        async def ping_server():
            try:
                # Internal ping - check server status
                return JSONResponse({"status": "alive"})
            except Exception as e:
                error_msg = f"Failed to ping: {str(e)}"
                return JSONResponse({"error": error_msg}, status_code=500)

        @self.app.post("/process_request")
        async def process_request(request: fastapi.Request):
            try:
                data = await request.json()
                input_text = data["input"]
                token = data.get("token")
                conversation_id = data.get("conversation_id")

                # Require valid token
                if not token:
                    return JSONResponse({"error": "Authentication token is required"}, status_code=401)
                try:
                    email = verify_websocket_token(token)
                except ValueError as e:
                    return JSONResponse({"error": str(e) or "Invalid token"}, status_code=401)

                logging.info(f"Processing request from {email}: {input_text[:100]}...")

                # Auto-create conversation if not provided
                if not conversation_id and email:
                    try:
                        new_conv = await self.chat_service.create_conversation(email)
                        conversation_id = new_conv.get("id")
                    except Exception as e:
                        return JSONResponse({"error": f"Failed to create conversation: {str(e)}"}, status_code=500)
                
                # Use ChatsService for unified message processing (same as WebSocket handler)
                try:
                    response_data = await self.chat_service.process_message(input_text, email, conversation_id)
                    
                    logging.debug(f"Request response data: {response_data}")
                    
                    # Extract the first assistant message for HTTP response
                    assistant_messages = response_data.get("assistant_messages", [])
                    if assistant_messages:
                        # Return the first assistant message as the response
                        first_message = assistant_messages[0]
                        return JSONResponse({
                            "response": first_message.get("content", ""),
                            "conversation_id": response_data.get("conversation_id")
                        })
                    else:
                        # No assistant messages - return empty response
                        return JSONResponse({
                            "response": "",
                            "conversation_id": response_data.get("conversation_id")
                        })
                except Exception as chat_error:
                    logging.error(f"ChatsService error for {email}: {str(chat_error)}")
                    return JSONResponse({"error": "Processing error occurred"}, status_code=400)
            except Exception as e:
                error_msg = f"Processing error for {email}: {str(e)}"
                logging.error(error_msg)
                return JSONResponse({"error": "Internal server error"}, status_code=500)


        # PYTHONDB WEBSOCKET ENDPOINT
        @self.app.websocket("/ws/{client_id}")
        async def websocket_endpoint_api(websocket: WebSocket, client_id: str):
            token = websocket.query_params.get("token")
            if not token:
                await websocket.close(code=4000, reason="Token is required")
                return
            try:
                email = verify_websocket_token(token)
                await self.ws_manager.handle_connection(websocket, client_id, self.chat_service, email)
            except ValueError as e:
                await websocket.close(code=4001, reason=str(e))
            except Exception as e:
                await websocket.close(code=4000, reason=f"Authentication failed: {str(e)}")


    async def start(self):
        config = uvicorn.Config(
            self.app,
            host=self.host,
            port=self.port,
            log_level="error",
            access_log=False,
            loop="asyncio"
        )
        server = uvicorn.Server(config)
        await server.serve()
