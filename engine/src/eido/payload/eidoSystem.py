import os
import inspect
import importlib
from src.eido.utils.eido_config import (
    fetch_operator_name,
    fetch_eido_purpose,
    fetch_agents_mode,
    fetch_awareness_mode,
    fetch_tools_mode,
    fetch_default_agent,
    fetch_agents_dict,
)

class eidoSystem():
    def __init__(self, email):
        self.email = email

    ########################################################

    async def foot_notes(self):
        notes = """
### FYI:
- NEVER reply with any other kind of format besides the one given to you.
- Only use either "agents" or "functions_list" in your response, it is FORBIDDEN to use both of them in your response at the same time.
- When you talk to other agents give direct instructions and DO NOT waste time on small talks and useless text, if relevant informations are already in the chat history then the other agents can read them too.
- Users does not have access to the messages that start with '[**INTERNAL SYSTEM MESSAGE**]' hence there might be cases where you need to rely internal informations to the users when it is relevant to the situation.
        """

        return notes

    async def response_format(self):
        response_format_prompt =f"""
### YOUR response MUST ALWAYS respect the following format structure, never reply outside of the following format in any other way or format:
//Beginning of response format//
```json
{{
    "response": "message", // This is the place where you put your text message response, do not create or use any other variable for replying or the system will reject your responses.
    "agents": [], // This is the section where you fill the names of the agents that you need to summon, name them here if they are needed for the next turn OR leave empty if you are fit for the job / no agents are needed / avaiable agents are not qualified.
    "functions_list": [
    {{
        "function": "names_of_the_functions_to_call", // Listed earlier as tools.
        "args": ["arg1", "arg2", "arg3"] // List of positional arguments.
        "kwargs": {{"name_of_keyword_argument": "value", "another_keyword_argument": "value"}} // if function requires named arguments use this field.
    }}],
    "next_step" : "" // To fill this variable you ONLY have two options 'continue' or 'await_operator'. Use 'continue' when you know what to do next OR use 'await_operator' when you are either: 1) done 2) waiting for the operator response 3) Stuck in a loop or in errors.
}}
```
//End of response format//
"""

        return response_format_prompt
    
    ########################################################

    async def load_tools(self):
        tools_mode = await fetch_tools_mode(email=self.email)

        if tools_mode == "true":

            self.function_map = {}
            function_descriptions = []
            
            tools_dir = 'src/eido/tools'
            
            for filename in os.listdir(tools_dir):
                if filename.endswith('.py') and not filename.startswith('__'):
                    module_name = f"src.eido.tools.{filename[:-3]}"
                    module_path = os.path.join(tools_dir, filename)
                    
                    try:
                        spec = importlib.util.spec_from_file_location(module_name, module_path)
                        module = importlib.util.module_from_spec(spec)
                        spec.loader.exec_module(module)
                        
                        for func_name in dir(module):
                            if not func_name.startswith("__"):
                                func_obj = getattr(module, func_name)
                                if callable(func_obj):
                                    self.function_map[func_name] = func_obj
                                    sig = inspect.signature(func_obj)
                                    function_descriptions.append(f"def {func_name}{sig}:")
                                    if func_obj.__doc__:
                                        function_descriptions.append(f"    \"{func_obj.__doc__}\"")
                    except Exception as e:
                        error = f"load_tools: Error loading tool {filename}: {e}"
                        print(error)

            function_descriptions_str = "\n".join(function_descriptions)
            tools_prompt = f"""### These are the tools (aka functions) available to YOU to use whenever needed:\n//Beginning of functions//\n'''\n{function_descriptions_str}\n'''\n//End of functions//"""
        
        elif tools_mode == "false":
            tools_prompt = "### No tools are avaiable in this session."
        
        return tools_prompt

    ########################################################

    async def self_awareness(self):
        awareness_mode = await fetch_awareness_mode(email=self.email)

        if awareness_mode == "false":
            awareness_prompt = "### You don't have awareness to your own source code at the moment."

        elif awareness_mode == "true":
            src_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../..'))
            openThalis_sourcecode = ""
            
            for root, dirs, files in os.walk(src_dir):
                # Exclude directories that start with '.' or are '__pycache__'
                dirs[:] = [d for d in dirs if not d.startswith('.') and d != '__pycache__']
                # Exclude files that start with '.'
                files = [f for f in files if not f.startswith('.')]
                for file in files:
                    if file.endswith('.py'):
                        file_path = os.path.join(root, file)
                        try:
                            with open(file_path, 'r', encoding='utf-8') as f:
                                content = f.read()
                            relative_path = os.path.relpath(file_path, src_dir)
                            openThalis_sourcecode += f"\n\n# File: {relative_path}\n{content}"
                        except Exception as e:
                            print(f"Error reading {file_path}: {e}")
            
            awareness_prompt = "### The following codebase is a copy of your source code, by being aware of it you will be able to act with awareness and know how you are built and work so you can maximize your performance:\n//Beginning of codebase//\n'''\n" + openThalis_sourcecode + "\n'''\n//End of codebase//"
        
        else:
            awareness_prompt = "ERROR: Awareness mode is not configured to True or False, please check your disk structure and try again."

        return awareness_prompt

    ########################################################

    async def eido_agents(self, agent_name):
        agents_mode = await fetch_agents_mode(email=self.email)

        if agents_mode == "true":
            agents_dict = await fetch_agents_dict(email=self.email)
            eido_agents_list = [
                {"name": agent, "description": agents_dict[agent]}
                for agent in agents_dict.keys() if agent != agent_name
            ]
            eido_agents_prompt = f"### The agents avaiable in this session and YOU can summon are:\n'''\n{eido_agents_list}\n'''"
            #print("\n\n-------\n\n### eido_agents: ", eido_agents_prompt, "\n\n-------\n\n")
        elif agents_mode == "false":
            eido_agents_prompt = "### No other AI agents are avaiable in this session."

        return eido_agents_prompt

    async def eido_purpose(self):
        eido_purpose_details = await fetch_eido_purpose(email=self.email)

        if eido_purpose_details == "":
            eido_purpose_prompt = ""

        else:
            eido_purpose_prompt = f"### The purpose of this session is:\n'''\n{eido_purpose_details}\n'''"

        return eido_purpose_prompt

    ########################################################

    async def operator_details(self):
        operator_name = await fetch_operator_name(email=self.email)
        operator_prompt = f"### YOU are interacting with the operator:\n'''{operator_name}'''"
        return operator_prompt

    async def agent_system(self, agent_name):
        agents = await fetch_agents_dict(email=self.email)
        if agent_name in agents:
            agent_prompt = agents[agent_name]
        else:
            default_agent = await fetch_default_agent(email=self.email)
            print("set_modelSystem: system not recognized, selecting default agent")
            if default_agent in agents:
                agent_prompt = agents[default_agent]
            else:
                any_agent_name = next(iter(agents.keys())) if agents else None
                agent_prompt = agents.get(any_agent_name, "")

        return agent_prompt

    ########################################################

    async def set_modelSystem(self, agent_name):
        agent_prompt = await self.agent_system(agent_name)
        
        operator_prompt = await self.operator_details()
        
        eido_purpose_prompt = await self.eido_purpose()
        eido_agents_prompt = await self.eido_agents(agent_name)
        
        awareness_prompt = await self.self_awareness()

        tools_prompt = await self.load_tools()
        
        response_format_prompt = await self.response_format()
        foot_notes_prompt = await self.foot_notes()
        
        assigned_system = f"""
{agent_prompt}

{operator_prompt}

{eido_purpose_prompt}

{eido_agents_prompt}

{awareness_prompt}

{tools_prompt}

{response_format_prompt}

{foot_notes_prompt}
        """

        return assigned_system

    ########################################################



