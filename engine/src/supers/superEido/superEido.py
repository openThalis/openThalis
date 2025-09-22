import asyncio
import threading
from src.eido.eido import eido


class superEido():
    def __init__(self, email, agent_name, conversation_id, stop_event: threading.Event):
        self.email = email
        self.agent_name = agent_name
        self.conversation_id = conversation_id

        self._is_running = False
        self._stop_event = stop_event

    async def initialize(self):
        self._is_running = True
        return self
 
    async def cleanup(self):
        self._is_running = False

    ##############################

    async def process_eido(self):
        try:
            eido_instance = eido( 
                self.agent_name, 
                self.email, 
                self.conversation_id
            )
            
            # Run eido processing
            await eido_instance.run()
            
            return True
        except Exception as e:
            print(f"\n\n[ERROR]: Error in eido processing: {str(e)}")
            return False

    ##############################

    async def run(self):
        try:
            if self._is_running and not self._stop_event.is_set():
                success = await self.process_eido()
                if success:
                    #print(f"\n\n[SUPER EIDO]: Eido processing completed for agent: {self.agent_name}")
                    pass
                else:
                    print(f"\n\n[ERROR]: Eido processing failed for agent: {self.agent_name}")
                
        except Exception as e:
            print(f"\n\n[ERROR]: Error in superEido: {str(e)}")
        finally:
            await self.cleanup()


def run_environment(email, stop_event, attachment):
    try:
        # Parse attachment to get agent_name and conversation_id
        if attachment and "|" in attachment:
            parts = attachment.split("|", 1)
            agent_name = parts[0]
            conversation_id = parts[1] if parts[1] != "None" else None
        else:
            # Fallback to default agent if no attachment provided
            agent_name = "default"  # This should be fetched from config in real implementation
            conversation_id = None
        
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        processor = superEido(email, agent_name, conversation_id, stop_event)
        loop.run_until_complete(processor.initialize())
        loop.run_until_complete(processor.run())
        
    except Exception as e:
        print(f"Error in superEido environment: {str(e)}")
    finally:
        try:
            loop.run_until_complete(loop.shutdown_asyncgens())
            loop.close()
        except:
            pass