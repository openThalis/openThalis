import threading
import importlib.util
import logging

ENGINE_INSTANCES = {}

async def get_or_create_engine(email):
    if email not in ENGINE_INSTANCES:
        ENGINE_INSTANCES[email] = engineThread(email)

    return ENGINE_INSTANCES[email]

class engineThread:
    def __init__(self, email):
        self.email = email
        self.threads = {}
        self.thread_counter = 0
        self._stop_events = {}
        self._env_threads = {}

    def _dynamic_import(self, module_path):
        try:
            module_name = module_path.replace('/', '.').replace('\\', '.').rstrip('.py')
            spec = importlib.util.spec_from_file_location(module_name, module_path)
            if spec is None:
                raise ImportError(f"Could not find module: {module_path}")
            module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(module)
            return module
        except Exception as e:
            raise ImportError(f"Failed to import {module_path}: {str(e)}")

    def create_thread(self, attachment="", env_mode=False, env_module_path=None, email=None):
        if env_mode and env_module_path:
            try:
                env_module = self._dynamic_import(env_module_path)
                if hasattr(env_module, 'run_environment'):
                    target_func = env_module.run_environment
                else:
                    raise RuntimeError(f"Environment module {env_module_path} does not have run_environment function")
            except ImportError as e:
                logging.error(f"Failed to load environment module {env_module_path}: {str(e)}")
                raise RuntimeError(f"Failed to load environment module: {str(e)}")
            except Exception as e:
                logging.error(f"Unexpected error loading environment module {env_module_path}: {str(e)}")
                raise RuntimeError(f"Failed to load environment module: {str(e)}")
        else:
            def target_func(email, stop_event, attachment):
                return None

        config = {
            "attachment": attachment,
            "env_mode": env_mode,
            "env_module_path": env_module_path if env_mode else None
        }

        thread_id = self.thread_counter
        self.thread_counter += 1

        stop_event = threading.Event()
        self._stop_events[thread_id] = stop_event
        
        try:
            thread = threading.Thread(
                target=target_func,
                args=(email, stop_event, attachment),
                daemon=True,
                name=f"EnvThread-{thread_id}"
            )

            thread_data = {
                "thread": thread,
                "config": config
            }

            self.threads[thread_id] = thread_data

            if env_mode:
                self._env_threads[thread_id] = thread

            thread.start()
            logging.info(f"Started thread {thread_id} for email {email}")
            return thread_id
        except Exception as e:
            # Clean up on failure
            self._stop_events.pop(thread_id, None)
            self.threads.pop(thread_id, None)
            self._env_threads.pop(thread_id, None)
            logging.error(f"Failed to start thread {thread_id}: {str(e)}")
            raise RuntimeError(f"Failed to start thread: {str(e)}")

    def list_threads(self):
        active_threads = {tid: data for tid, data in self.threads.items() 
                         if data["thread"].is_alive()}
        
        if not active_threads:
            return "No active threads"
        
        output = "Active threads:\n"
        for tid, data in active_threads.items():
            config = data["config"]
            env_info = f" [{config['env_module_path']}]" if config.get('env_mode') and config.get('env_module_path') else ""
            output += f"Thread {tid}: '{config['attachment']}'{env_info}\n"
        return output

    def kill_thread(self, thread_id):
        if thread_id not in self.threads:
            logging.warning(f"Thread {thread_id} not found in threads dictionary")
            return False

        try:
            logging.info(f"Attempting to kill thread {thread_id}")

            # Set the stop event first
            if thread_id in self._stop_events:
                self._stop_events[thread_id].set()
                logging.info(f"Set stop event for thread {thread_id}")

            # Wait for env thread to finish if it exists
            if thread_id in self._env_threads:
                try:
                    env_thread = self._env_threads[thread_id]
                    if env_thread and env_thread.is_alive():
                        logging.info(f"Waiting for env thread {thread_id} to finish")
                        env_thread.join(timeout=2)
                        if env_thread.is_alive():
                            logging.warning(f"Env thread {thread_id} did not finish within timeout")
                    self._env_threads.pop(thread_id, None)
                except Exception as e:
                    logging.warning(f"Error stopping env thread {thread_id}: {str(e)}")

            # Wait for main thread to finish
            thread_data = self.threads.get(thread_id)
            if thread_data and "thread" in thread_data:
                thread = thread_data["thread"]
                if thread and thread.is_alive():
                    logging.info(f"Waiting for main thread {thread_id} to finish")
                    thread.join(timeout=2)
                    if thread.is_alive():
                        logging.warning(f"Main thread {thread_id} did not finish within timeout")
                else:
                    logging.info(f"Main thread {thread_id} is not alive or None")
            else:
                logging.warning(f"Thread data for {thread_id} is missing or invalid")

            # Clean up thread resources
            self._stop_events.pop(thread_id, None)
            self.threads.pop(thread_id, None)
            logging.info(f"Successfully cleaned up thread {thread_id}")
            return True
        except Exception as e:
            logging.error(f"Error killing thread {thread_id}: {str(e)}")
            logging.error(f"Exception type: {type(e).__name__}")
            import traceback
            logging.error(f"Traceback: {traceback.format_exc()}")
            return False

