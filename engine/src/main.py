import sys
sys.dont_write_bytecode = True

import time
import signal
import asyncio
from multiprocessing import Process, Event
from urllib.parse import urlparse
from src.api.coms.commands import commands
from src.api.server.server import thalisServer

class main:
    def __init__(self, server_address, email):
        self.server_address = server_address
        self.email = email

        self.running = True
        self.stop_event = Event()
        self.processes = []
        
        signal.signal(signal.SIGINT, self.handle_shutdown)
        signal.signal(signal.SIGTERM, self.handle_shutdown)

    async def run_async(self):
        await commands(self.email).initialize()
        # AUTO START GENERAL MOAT FOR SUPERS
        await commands(self.email).create_thread("src/engine/moat/moat.py", "MOAT")
        
        # Start the server directly - parse URL properly
        parsed_url = urlparse(self.server_address)
        host = parsed_url.hostname if parsed_url.hostname else None
        port = parsed_url.port if parsed_url.port else None

        if not host or not port:
            raise ValueError(f"Invalid server address: {self.server_address} (host: {host}, port: {port})")
        
        server = thalisServer(host, port)
        await server.start()

    def run_main(self):
        try:
            asyncio.run(self.run_async())
        except Exception as e:
            print(f"Error in unified server process: {e}")

    def handle_shutdown(self, signum=None, frame=None):
        print("\n🛑 Shutting down Thalis Unified Server...")
        self.running = False
        self.stop_event.set()

        for process in self.processes:
            if process.is_alive():
                process.terminate()
                process.join(timeout=5)
        print("✓ Server shutdown complete")
    
    def monitor_processes(self):
        while self.running:
            for process in self.processes:
                if not process.is_alive() and self.running:
                    print(f"⚠️  Process {process.name} died, restarting...")
                    self.restart_process(process)
            time.sleep(1)

    def restart_process(self, process):
        if process.name == "ThalisUnifiedServer":
            new_process = Process(
                target=self._run_main_process,
                args=(self.server_address, self.email),
                name="ThalisUnifiedServer"
            )
        else:
            return
            
        self.processes.remove(process)
        new_process.start()
        self.processes.append(new_process)
        print(f"✓ Restarted {new_process.name}")

    @staticmethod
    def _run_main_process(server_address, email):
        main_instance = main(server_address, email)
        main_instance.run_main()

    def run(self):
        print("🚀 === Thalis Server Launcher ===")
        print(f"Starting server on {self.server_address}")
        
        # Start unified server process
        unified_process = Process(
            target=self._run_main_process,
            args=(self.server_address, self.email),
            name="ThalisUnifiedServer"
        )
        unified_process.start()
        self.processes.append(unified_process)
        print("✓ Server running")
        print("✓ Press Ctrl+C to stop")
        print("================================")
        
        self.monitor_processes()