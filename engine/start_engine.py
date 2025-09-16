import sys
sys.dont_write_bytecode = True

import os
from dotenv import load_dotenv
from src.main import main

load_dotenv()



def launch_env():
    server_address = os.environ["BACKEND_URL"]
    email = ""
    main(server_address, email).run()

if __name__ == '__main__':
    launch_env()