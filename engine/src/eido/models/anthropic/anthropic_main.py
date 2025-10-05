import anthropic

from src.eido.utils.apis_config import fetch_api_key_for_provider
from src.eido.utils.eido_config import (
    fetch_model_name,
    fetch_model_max_tokens,
    fetch_model_temperature,
)

class anthropic_main_class:
    def __init__(self, system, chat_messages):
        self.system = system
        self.messages = chat_messages

    async def text_response(self, email):
        llm_api_key = await fetch_api_key_for_provider("anthropic", email=email)
        
        model = await fetch_model_name(email=email)
        max_tokens = await fetch_model_max_tokens(email=email)
        temperature = await fetch_model_temperature(email=email)

        if not llm_api_key:
            print(f"[ANTHROPIC_ERROR] No API key provided")
            return "FAIL"

        client = anthropic.Anthropic(api_key=llm_api_key)
        message_list = []
        all_messages = []
        for message in self.messages:
            role = message["role"]
            content = message["content"]
            if content is None:  # Skip messages with null content
                continue
            all_messages.append(content)
            message_list.append({"role": role, "content": content})
        
        #print(f"\n\n### System: {self.system}")
        #print(f"\n\n### Messages: {message_list}")
        
        try:
            create_args = {
                "model": str(model),
                "messages": message_list,
                "system": self.system,
            }
            if max_tokens:
                create_args["max_tokens"] = int(max_tokens)
            if temperature:
                create_args["temperature"] = float(temperature)
            response = client.messages.create(**create_args)
        except Exception as e:
            print(f"[ANTHROPIC_ERROR] {type(e).__name__}: {e}")
            return "FAIL"

        content = getattr(response, 'content', None)
        if content and len(content) > 0 and hasattr(content[0], 'text'):
            text_content = content[0].text
            if text_content and text_content.strip():
                return text_content.strip()
            else:
                print(str(response))
                return "FAIL"
        print(str(response))
        return "FAIL"