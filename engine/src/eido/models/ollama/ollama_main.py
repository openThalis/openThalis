import ollama
import json
import re
from src.eido.utils.eido_config import (fetch_model_name,fetch_model_max_tokens,fetch_model_temperature,)

class ollama_main_class:
    def __init__(self, system, chat_messages):
        self.system = system
        self.messages = chat_messages

    def _extract_json_from_response(self, content):
        """Extract JSON content from response, handling thinking text and other prefixes"""
        if not content:
            return content
        
        if "</think>" in content:
            parts = content.split("</think>", 1)
            if len(parts) > 1:
                content = parts[1].strip()
        
        json_pattern = r'\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}'
        matches = re.findall(json_pattern, content, re.DOTALL)
        
        if matches:
            json_candidate = max(matches, key=len)
            
            try:
                json.loads(json_candidate)
                return json_candidate.strip()
            except json.JSONDecodeError:
                pass
        
        lines = content.split('\n')
        json_started = False
        json_lines = []
        brace_count = 0
        
        for line in lines:
            line = line.strip()
            if not json_started and line.startswith('{'):
                json_started = True
                json_lines.append(line)
                brace_count += line.count('{') - line.count('}')
            elif json_started:
                json_lines.append(line)
                brace_count += line.count('{') - line.count('}')
                if brace_count == 0:
                    break
        
        if json_lines:
            potential_json = '\n'.join(json_lines)
            try:
                json.loads(potential_json)
                return potential_json
            except json.JSONDecodeError:
                pass
        
        return content

    async def text_response(self, email):
        
        try:
            model = await fetch_model_name(email)
            max_tokens = await fetch_model_max_tokens(email)
            temperature = await fetch_model_temperature(email)

        except Exception as cfg_err:
            print(f"[OLLAMA_CONFIG_ERROR] Failed to resolve config: {type(cfg_err).__name__}: {cfg_err}")
            return "FAIL"
        
        try:
            #print(f"[DEBUG] Initializing Ollama client...")
            client = ollama.Client()
            
            message_list = []
            for message in self.messages:
                role = message.get("role")
                content = message.get("content")
                
                if not content or not role:
                    continue
                    
                message_list.append({"role": role, "content": content})
            
            message_list = [{"role": "system", "content": self.system}] + message_list
            
            options = {}
            if temperature:
                options['temperature'] = float(temperature)
            if max_tokens:
                options['num_predict'] = int(max_tokens)
            
            
            try:
                response = client.chat(
                    model=str(model),
                    messages=message_list,
                    options=options
                )
                #print(f"ollama_main_class response: {response}")
            except Exception as chat_error:
                print(f"[ERROR] Chat request failed: {type(chat_error).__name__}: {chat_error}")
                raise chat_error

            if response and 'message' in response and 'content' in response['message']:
                content = response['message']['content']
                if content and content.strip():
                    cleaned_content = self._extract_json_from_response(content)
                    #print(f"[SUCCESS] Response received from model {model}")
                    return cleaned_content
                else:
                    print(f"[EMPTY] Received empty response from ollama")
                    return "FAIL"
            else:
                print(f"[INVALID] Invalid response structure from ollama")
                return "FAIL"
                
        except ollama.ResponseError as e:
            error_msg = f"[OLLAMA_ERROR] Response error: {e.error if hasattr(e, 'error') else str(e)}"
            if hasattr(e, 'status_code') and e.status_code == 404:
                error_msg += f" - Model '{model}' not found. Please pull the model first with: ollama pull {model}"
            print(f"\n\n#### {error_msg}")
            return "FAIL"
            
        except ConnectionError as e:
            error_msg = f"[CONNECTION_ERROR] Cannot connect to Ollama server: {str(e)} - Please ensure Ollama is running"
            print(f"\n\n#### {error_msg}")
            return "FAIL"
            
        except ValueError as e:
            error_msg = f"[VALUE_ERROR] Invalid configuration values: {str(e)}"
            print(f"\n\n#### {error_msg}")
            return "FAIL"
            
        except Exception as e:
            error_msg = f"[UNEXPECTED_ERROR] Unexpected error in ollama_main text_response: {str(e)}"
            print(f"\n\n#### {error_msg}")
            return "FAIL" 