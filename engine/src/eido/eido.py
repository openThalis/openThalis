import json
import asyncio
import inspect
from typing import Optional

from src.eido.payload.eidoSystem import eidoSystem
from src.eido.payload.eidoConversation import eidoConversation

from src.eido.utils.eido_config import fetch_provider_name
from src.eido.models.xai.xai_main import xai_main_class
from src.eido.models.openai.openai_main import openai_main_class
from src.eido.models.ollama.ollama_main import ollama_main_class


from src.disk.pythonDB.services.chats import crud as chat_crud

class eido:
    def __init__(self, agent_name, email, conversation_id):
        self.agent_name = agent_name
        self.email = email
        self.conversation_id = conversation_id

        self.conversation = eidoConversation(self.email, self.conversation_id)
        self.system = eidoSystem(self.email)

        self.last_assistant_message_id: Optional[str] = None
        self.last_assistant_content: Optional[str] = None

########################################################

    async def append_chat_history(self, sender, data, notify_ws=True):
        if data is None:
            return

        data_str = str(data).strip()
        if not data_str:
            return

        try:
            saved = await chat_crud.add_message(self.conversation_id, data_str, sender, self.email)
        except ValueError as e:
            print(f"\n\n[WARNING]: Skipped saving empty message: {e}")
            return
        
        if sender == "assistant":
            self.last_assistant_message_id = saved.get("id")
            self.last_assistant_content = data_str
            
            if notify_ws:
                await self._notify_websocket_clients(saved)
            
        return saved

    async def _notify_websocket_clients(self, saved_message):
        """Send WebSocket notification for new assistant message"""
        try:
            # Skip internal system messages
            content = saved_message.get("content", "")
            if content.startswith("[**INTERNAL SYSTEM MESSAGE**]"):
                return
                
            from src.api.server.server import thalisServer
            server = thalisServer.get_instance()
            
            # Broadcast the new message to all connected clients for this user
            message_data = {
                "type": "response",
                "content": content,
                "assistant_message_id": saved_message.get("id"),
                "conversation_id": self.conversation_id
            }
            
            # Send to all clients connected for this user's email
            await server.ws_manager.send_to_user(self.email, message_data)
                        
        except Exception as e:
            print(f"\n\n[ERROR]: Error sending WebSocket notification: {e}")

########################################################

    async def _handle_tool_execution(self, function_detail):
        function_name = function_detail["function"]
        args = function_detail.get("args", [])
        kwargs = function_detail.get("kwargs", {})

        function_execution_notification = f"Executing function: {function_detail}"
        print(f"\n\n[TOOL]: {function_execution_notification}")
        await self._handle_internal_messages_pre_processing(function_execution_notification)

        if function_name not in self.function_map:
            result = {"Success": False, "Error": f"Function {function_name} not found."}
        else:
            func = self.function_map[function_name]
            try:
                try:
                    func_signature = inspect.signature(func)
                    if "email" in func_signature.parameters and ("email" not in kwargs or kwargs.get("email") is None):
                        kwargs["email"] = self.email
                except Exception:
                    pass

                if asyncio.iscoroutinefunction(func):
                    result = await func(*args, **kwargs)
                else:
                    result = func(*args, **kwargs)
            except Exception as e:
                result = {"Success": False, "Error": str(e)}

        function_message_notifiaction = f"Tool response: '''{str(result)}'''"
        #print(f"\n\n[TOOL]: {function_message_notifiaction}")
        await self._handle_internal_messages_pre_processing(function_message_notifiaction)
        
    async def _handle_agent_execution(self, agent):
        summon_message = f"Summoning agent: {agent}."
        await self._handle_internal_messages_pre_processing(summon_message)

        agent_response = await eido(agent, self.email, self.conversation_id).run()
        
        if agent_response is not None and str(agent_response).strip():
            agent_message = f"[{agent}]: {agent_response}"
            await self.append_chat_history("assistant", agent_message)

########################################################

    async def _handle_internal_messages_pre_processing(self, message):
        internal_msg_prefix = "[**INTERNAL SYSTEM MESSAGE**]"
        internal_msg = f"{internal_msg_prefix} {message}"
        await self.append_chat_history("assistant", internal_msg, notify_ws=False)

    async def _handle_internal_messages_post_processing(self):
        if not self.conversation_id:
            return
        try:
            history = await chat_crud.get_conversation_history(self.conversation_id, self.email)
            internal_prefix = "[**INTERNAL SYSTEM MESSAGE**]"
            deleted_count = 0
            
            for msg in history:
                content = msg.get("content") or ""
                if isinstance(content, str) and content.startswith(internal_prefix):
                    msg_id = msg.get("id")
                    if msg_id:
                        try:
                            success = await chat_crud.delete_message(msg_id, self.email)
                            if success:
                                deleted_count += 1
                            else:
                                print(f"\n\n[WARNING]: Failed to delete internal message {msg_id} - not found or permission denied")
                        except Exception as e:
                            print(f"\n\n[WARNING]: Error deleting internal message {msg_id}: {e}")
            
                
        except Exception as e:
            print(f"\n\n[ERROR]: Error during internal messages cleanup: {e}")
        
#############################################

    async def next_step_determinator(self, parsed_response):
        if not isinstance(parsed_response, dict):
            print("\n\n[ERROR]: Invalid response format.")
        
        #text_response = parsed_response.get("response", "")
        next_step = parsed_response.get("next_step")

        if next_step:
            if next_step == "continue":
                await self.run()
            
            elif next_step == "await_operator":
                pass
            
            else:
                next_step_error = "ERROR: No valid next_step found"
                print(f"\n\n[ERROR]: {next_step_error}")
    
        else:
            next_step_error = "ERROR: No next_step found in the LLM response"
            print(f"\n\n[ERROR]: {next_step_error}")
  
    async def process_llm_response_gate_2(self, cleaned_response):
        parsed_response = json.loads(cleaned_response)
        text_response = parsed_response.get("response", "")
        if text_response and text_response.strip():
            agent_response = f"[{self.agent_name}]: {text_response}"
            await self.append_chat_history("assistant", agent_response)
        
        agents = parsed_response.get("agents", [])
        functions_list = parsed_response.get("functions_list", [])
        
        if agents:
            for agent in agents:
                await self._handle_agent_execution(agent)
                
            message = "All summoned agents have been executed."
            await self._handle_internal_messages_pre_processing(message)
            await self.next_step_determinator(parsed_response)
        
        elif functions_list:
            for function_detail in functions_list:
                await self._handle_tool_execution(function_detail)
            
            message = "All summoned functions have been executed."
            await self._handle_internal_messages_pre_processing(message)
            await self.next_step_determinator(parsed_response)
        
        else:
            await self.next_step_determinator(parsed_response)

    async def process_llm_response(self, response):
        if not (response.startswith('{') and response.endswith('}')):
            json_error_handling_failed = f"ERROR: Last response is not a valid JSON object. You must follow the response format given to you."
            await self._handle_internal_messages_pre_processing(json_error_handling_failed)
            print(json_error_handling_failed + " - Retrying")
            response = await self.run()
            
            await self.process_llm_response(response)
            
        else:
            await self.process_llm_response_gate_2(response)

#############################################

    async def get_model_response(self, system_prompt, chat_messages): 
        provider_name = await fetch_provider_name(self.email)
        if not self.conversation_id:
            raise ValueError("conversation_id is required for eido operations")

        provider_map = {
            "openai": openai_main_class,
            "ollama": ollama_main_class,
            "xai": xai_main_class
        }

        if provider_name not in provider_map:
            response = "Provider not found"
            print(f"\n\n[ERROR]: get_model_response: {response}")
            return response

        provider_class = provider_map[provider_name]

        response = await provider_class(system_prompt, chat_messages).text_response(self.email)

        if response.startswith('```json') and response.endswith('```'):
            response = response[7:-3].strip()
            
        return response
    
#############################################

    async def run(self):

        system_prompt = await self.system.set_modelSystem(self.agent_name)
        self.function_map = getattr(self.system, 'function_map', {})

        chat_messages = await self.conversation.chat_history()

        response = await self.get_model_response(system_prompt, chat_messages)

        #print(f"\n\n-------\n\n### System prompt:\n\n{system_prompt}\n\n-------\n\n")
        #print(f"\n\n-------\n\n### Chat messages:\n\n{chat_messages}\n\n-------\n\n")
        #print(f"\n\n-------\n\n### Model response:\n\n{response}\n\n-------\n\n")

        max_retries = 5
        retry_delay = 3
        for attempt in range(max_retries):
            if response != "FAIL":
                break

            print(f"\n\n[ERROR]: {response}\n\n Retrying... (attempt {attempt + 1} of {max_retries})")
            for i in range(retry_delay, 0, -1):
                print(f'Retrying in {i} seconds...')
                await asyncio.sleep(1)

            response = await self.get_model_response(system_prompt, chat_messages)
        
        if response == "FAIL":
            print("\n\n[ERROR]: Maximum retries reached. Aborting.")
            return

        else:
            await self.process_llm_response(response)

        await self._handle_internal_messages_post_processing()