import asyncio
import threading
import random


class superTemplate():
    def __init__(self, email, stop_event: threading.Event):
        self.email = email
        self._is_running = False
        self._stop_event = stop_event

    async def initialize(self):
        self._is_running = True
        return self
 
    async def cleanup(self):
        self._is_running = False

    ##############################

    async def get_random_color(self):
        return random.choice(["red", "green", "blue", "yellow", "purple", "orange", "pink", "brown", "gray", "black", "white"])

    async def life_cycle(self, random_color):
        random_number = random.randint(1, 100)
        print(f"\n\n[SUPER TEMPLATE]: {self.email} - {random_color.upper()} - {random_number}")
        await asyncio.sleep(3)


    ##############################

    async def run(self):
        random_color = await self.get_random_color()
        try:
            while self._is_running and not self._stop_event.is_set():
                await self.life_cycle(random_color)
                
        except Exception as e:
            print(f"\n\n[ERROR]: Error in superTemplate: {str(e)}")
        finally:
            await self.cleanup()



def run_environment(email, stop_event, attachment):
    try:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        processor = superTemplate(email, stop_event)
        loop.run_until_complete(processor.initialize())
        loop.run_until_complete(processor.run())
    except Exception as e:
        print(f"Error in superTemplate environment: {str(e)}")
    finally:
        try:
            loop.run_until_complete(loop.shutdown_asyncgens())
            loop.close()
        except:
            pass