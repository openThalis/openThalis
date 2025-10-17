from src.engine.engine import get_or_create_engine
from src.api.coms.commands import commands

from src.eido.eido import eido
from src.eido.utils.eido_config import fetch_default_agent, fetch_agents_dict


class thalisAPI():
    def __init__(self, email):
        self.email = email
        self.commands = commands(self.email)

    ####################################################
    
    async def _start_eido_thread(self, agent_name, conversation_id):
        try:
            engine_instance = await get_or_create_engine(self.email)

            attachment = f"{agent_name}|{conversation_id}"
            
            thread_id = engine_instance.create_thread(
                attachment=attachment,
                env_mode=True,
                env_module_path="src/supers/superChat/superChat.py",
                email=self.email
            )
            
            print(f"\n\n### Eido processing thread {thread_id} for agent: {agent_name}")

        except Exception as e:
            print(f"Error starting eido thread: {str(e)}")

    async def _get_target_agent(self, input):
        if input.startswith("@"):
            parts = input[1:].strip().split(" ", 1)
            agent_name = parts[0]
            eido_agents = await fetch_agents_dict(self.email)

            if agent_name in eido_agents:
                return agent_name
            else:
                # Agent not found, return default agent
                default_agent = await fetch_default_agent(email=self.email)
                return default_agent
        else:
            return await fetch_default_agent(email=self.email)

    ####################################################

    async def process(self, input, conversation_id):
        if not input or not input.strip():
            print(f"\n\n[WARNING]: Received empty input, skipping processing")
            return {}
       
        target_agent = await self._get_target_agent(input)

        self.eidoInstance = eido(target_agent, self.email, conversation_id)

        await self.eidoInstance.append_chat_history("user", input)

        if input.startswith("/"):
            self.commands.conversation_id = conversation_id
            response = await self.commands.command_detected(input)
            if input != "/cch":
                await self.eidoInstance.append_chat_history("assistant", response, notify_ws=False)
            return {}

        else:
            await self._start_eido_thread(target_agent, conversation_id)
            
            return {}
         
    ####################################################
