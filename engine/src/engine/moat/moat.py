import asyncio
from datetime import datetime, UTC
import threading
import random

from src.engine.engine import get_or_create_engine
from src.engine.moat.components.moatTasks import moatTasks
from src.engine.moat.components.moatAether import moatAether

TERM_COLORS = {
    "red": "\033[91m",
    "green": "\033[92m",
    "yellow": "\033[93m",
    "blue": "\033[94m",
    "purple": "\033[95m",
    "gray": "\033[90m",
    "reset": "\033[0m"
}

class moat():
    def __init__(self, email, stop_event: threading.Event):
        self.email = email

        self._is_running = False
        self._stop_event = stop_event

    async def initialize(self):
        self._is_running = True
        return self
 
    async def cleanup(self):
        self._is_running = False
    
    async def get_random_color(self):
        return random.choice(list(TERM_COLORS.keys() - {"reset"}))

    ############################################################
    
    async def show_alive(self):
        def get_current_date_time():
            return datetime.now(UTC).strftime("%d-%m-%Y - %A - %H:%M:%S")
        color_code = TERM_COLORS.get(self.random_color, TERM_COLORS["reset"])
        reset_code = TERM_COLORS["reset"]
        current_date_time = get_current_date_time()
        print(f"\n\n{color_code}[MOAT]: {current_date_time}{reset_code}")

    ############################################################

    async def summon_super(self, superType, data):
        try:
            user_email = data.get('user_email')
            if not user_email:
                print(f"[MOAT ERROR]: No user email found for task {data.get('id')}")
                return

            engine_instance = await get_or_create_engine(user_email)

            if superType == "superTask":
                task_title = data.get('title')
                task_description = data.get('description')
                assigned_agent = data.get('assigned_agent')
                schedule_summary = data.get('schedule_summary')
                attachment = f"{data['id']}|{task_title}|{task_description}|{assigned_agent}|{schedule_summary}"

                thread_id = engine_instance.create_thread(
                    attachment=attachment,
                    env_mode=True,
                    env_module_path="src/supers/superTask/superTask.py",
                    email=user_email
                )

            elif superType == "superAether":
                program_id = data.get('id')
                if not program_id:
                    print(f"[MOAT ERROR]: No program id found for aether program {data}")
                    return
                thread_id = engine_instance.create_thread(
                    attachment=program_id,
                    env_mode=True,
                    env_module_path="src/supers/superAether/superAether.py",
                    email=user_email
                )

        except Exception as e:
            print(f"\n\n[MOAT ERROR]: Error summoning super {superType}: {str(e)}")

    ##############################

    async def monitor_aether(self):
        try:
            async with moatAether() as aether_reader:
                programs_to_update = await aether_reader.run()

                if programs_to_update:
                    #print(f"\n\n[MOAT]: Found {len(programs_to_update)} programs to update")
                    for program in programs_to_update:
                        #print(f"\n\n[MOAT]: Summoning superAether for program: {program['name']}")
                        await self.summon_super("superAether", program)
                else:
                    #print(f"\n\n[MOAT]: No programs to update found")
                    pass
        except Exception as e:
            print(f"\n\n[MOAT ERROR]: Error monitoring aether: {str(e)}")

    async def monitor_tasks(self):
        try:
            async with moatTasks() as tasks_reader:
                active_tasks = await tasks_reader.run()

                if active_tasks:
                    #print(f"\n\n[MOAT]: Found {len(active_tasks)} pending tasks to execute")
                    for task in active_tasks:
                        #print(f"\n\n[MOAT]: Deploying superTask for task ID: {task['id']} (user: {task.get('user_email', 'unknown')})")
                        await self.summon_super("superTask", task)
                else:
                    #print("\n\n[MOAT]: No pending tasks found")
                    pass

        except Exception as e:
            print(f"[MOAT ERROR]: Error monitoring tasks: {str(e)}")

    ##############################

    async def life_cycle(self):
        #await self.show_alive()
        await self.monitor_tasks()
        await self.monitor_aether()
        await asyncio.sleep(5)

    ##############################

    async def run(self):
        self.random_color = await self.get_random_color()
        print(f"\n\n### [ENGINE]: Activated MOAT environment")
        try:
            while self._is_running and not self._stop_event.is_set():
                await self.life_cycle()
                
        except Exception as e:
            print(f"\n\n[ERROR]: Error in MOAT environment: {str(e)}")
        finally:
            await self.cleanup()

def run_environment(email, stop_event, attachment):
    try:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        processor = moat(email, stop_event)
        loop.run_until_complete(processor.initialize())
        loop.run_until_complete(processor.run())
    except Exception as e:
        print(f"\n\n[ERROR]: Error in MOAT environment: {str(e)}")
    finally:
        try:
            loop.run_until_complete(loop.shutdown_asyncgens())
            loop.close()
        except:
            pass