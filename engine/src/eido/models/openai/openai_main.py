import openai
from src.eido.utils.apis_config import fetch_api_key_for_provider
from src.eido.utils.eido_config import (
    fetch_model_name,
    fetch_model_max_tokens,
    fetch_model_temperature,
)

class openai_main_class:
    def __init__(self, system, chat_messages):
        self.system = system
        self.messages = chat_messages

    async def text_response(self, email):
        llm_api_key = await fetch_api_key_for_provider("openai", email=email)
        
        model = await fetch_model_name(email=email)
        max_tokens = await fetch_model_max_tokens(email=email)
        temperature = await fetch_model_temperature(email=email)

        client = openai.OpenAI(api_key=llm_api_key)
        message_list = []
        all_messages = []
        for message in self.messages:
            role = message["role"]
            content = message["content"]
            if content is None:  # Skip messages with null content
                continue
            all_messages.append(content)
            message_list.append({"role": role, "content": content})
        
        message_list = [{"role": "system", "content": self.system}] + message_list
        
        #print(f"\n\n### System: {self.system}")
        #print(f"\n\n### Messages: {message_list}")
        
        try:
            create_args = {
                "model": str(model),
                "messages": message_list,
            }
            if max_tokens:
                create_args["max_completion_tokens"] = int(max_tokens)
            if temperature:
                create_args["temperature"] = float(temperature)
            response = client.chat.completions.create(**create_args)
        except Exception as e:
            print(f"[OPENAI_ERROR] {type(e).__name__}: {e}")
            return "FAIL"

        content = getattr(getattr(response.choices[0], 'message', {}), 'content', None)
        if content is not None:
            if content == "":
                print(str(response))
                return "FAIL"
            return content
        print(str(response))
        return "FAIL"