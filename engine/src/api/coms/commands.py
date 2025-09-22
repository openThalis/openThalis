import asyncio
import os
import importlib.util
import inspect

from src.api.coms.comms_library.cch import cch

from src.engine.engine import get_or_create_engine

class commands:
    def __init__(self, email):
        self.email = email
        self.conversation_id = None  # Will be set by thalisAPI when processing requests

        self._initialized = False
        self.function_map = {}
        self.function_descriptions = []
    
    ####################################################

    async def initialize(self):
        self.function_map = {}
        self.function_descriptions = []
        
        comms_library_dir = 'src/api/coms/comms_library'
        
        # Check if directory exists
        if not os.path.exists(comms_library_dir):
            print(f"Error: The specified path for commands library does not exist: {comms_library_dir}")
            return
        
        # Load all Python files from the library directory
        for filename in os.listdir(comms_library_dir):
            if filename.endswith('.py') and not filename.startswith('__'):
                module_name = f"src.api.coms.comms_library.{filename[:-3]}"
                module_path = os.path.join(comms_library_dir, filename)
                
                try:
                    # Dynamic module loading like eidoCore
                    spec = importlib.util.spec_from_file_location(module_name, module_path)
                    module = importlib.util.module_from_spec(spec)
                    spec.loader.exec_module(module)
                    
                    # Add all callable functions to function_map
                    for func_name in dir(module):
                        if not func_name.startswith("__"):
                            func_obj = getattr(module, func_name)
                            if callable(func_obj):
                                self.function_map[func_name] = func_obj
                                # Create function signature for documentation
                                sig = inspect.signature(func_obj)
                                self.function_descriptions.append(f"{func_name}{sig}")
                                if func_obj.__doc__:
                                    self.function_descriptions.append(f"    \"{func_obj.__doc__}\"")
                                    
                except Exception as e:
                    print(f"Error loading command module {filename}: {e}")
        
        self._initialized = True

    async def ensure_initialized(self):
        if not self._initialized:
            #print("\n~ Re/Initializing commands")
            await self.initialize()
        return True

    async def reload_commands(self):
        await self.initialize()
        return "Commands reloaded"

    ####################################################

    async def create_thread(self, env_module_path, *args):
        engine_instance = await get_or_create_engine(self.email)

        attachment = str(args[0]) if args else ""

        thread_id = engine_instance.create_thread(
            attachment=attachment,
            env_mode=True,
            env_module_path=env_module_path,
            email=self.email
        )


        return thread_id, attachment, env_module_path

    async def list_threads(self):
        engine_instance = await get_or_create_engine(self.email)
        return engine_instance.list_threads()
    
    async def kill_thread(self, thread_id):

        engine_instance = await get_or_create_engine(self.email)
        result = engine_instance.kill_thread(thread_id)
        if result:
            return f"Successfully killed thread {thread_id}"
        else:
            return f"Failed to kill thread {thread_id} - thread may not exist or already stopped"

    ####################################################

    async def command_detected(self, input):
        await self.ensure_initialized()

        # Split input into command and arguments
        parts = input[1:].split()  # Remove the / and split
        command = parts[0]
        args = parts[1:] if len(parts) > 1 else []

        # Handle built-in commands first
        builtin_command_map = {
            "?": lambda: self.list_commands(),
            "r": lambda: self.reload_commands(),
            "cch": lambda: cch(self.email, self.conversation_id),
            "lt": lambda: self.list_threads(),
            "kt": lambda: self.kill_thread(int(args[0])) if args else None,
        }

        if command in builtin_command_map:
            func = builtin_command_map[command]
            try:
                if asyncio.iscoroutinefunction(func):
                    return await func()
                else:
                    result = func()
                    if asyncio.iscoroutine(result):
                        return await result
                    return result
            except Exception as e:
                return f"Error executing built-in command: {str(e)}"

        # Handle dynamically loaded commands from function_map
        if command in self.function_map:
            func = self.function_map[command]
            try:
                if asyncio.iscoroutinefunction(func):
                    return await func(*args)
                else:
                    result = func(*args)
                    if asyncio.iscoroutine(result):
                        return await result
                    return result
            except Exception as e:
                return f"Error executing command '{command}': {str(e)}"
        else:
            return f"Unknown command: {command}"
            
    ####################################################

    def list_commands(self):
        builtin_commands = {
            "?": "Show this help message",
            "r": "Reload commands",
            "cch": "Clear altar chat history from database and visually",
            "lt": "List all active threads",
            "kt": "Kill a thread by ID"
        }
        
        result = "Available commands:\n\n# Built-in Commands\n"
        result += "\n".join(f"/{cmd}: {desc}" for cmd, desc in builtin_commands.items())
        
        if self.function_map:
            result += "\n\n# Library Commands\n"
            for func_name in sorted(self.function_map.keys()):
                func = self.function_map[func_name]
                doc = func.__doc__ if func.__doc__ else "No description available"
                result += f"/{func_name}: {doc.strip()}\n"
        
        return result
