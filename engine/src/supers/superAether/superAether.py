import uuid
import asyncio
import threading
from datetime import datetime, timezone
from src.api.thalisAPI import thalisAPI
from src.disk.core.db import AsyncSessionLocal
from src.disk.users.crud import get_or_create_user
from src.disk.services.chats import crud as chats_crud
from src.disk.services.chats.models import Conversation
from src.disk.services.aether import crud as aether_crud
from src.supers.superAether.components import prompts as aether_prompts

class superAether():
    def __init__(self, email, program_data, stop_event: threading.Event):
        self.email = email
        self.program_data = program_data or {}
        self.program_id = self.program_data.get('id')

        self.is_running = False
        self.stop_event = stop_event

    async def initialize(self):
        self.is_running = True
        return self

    async def cleanup(self):
        self.is_running = False

    ############################################################

    async def delete_conversation(self, conversation_id):
        try:
            await chats_crud.delete_conversation(conversation_id, self.email)
        except Exception as e:
            print(f"\n\n[SUPER AETHER ERROR]: Failed to delete conversation {conversation_id}: {e}")
    
    async def update_program(self, updates):
        try:
            await aether_crud.update_program(self.email, self.program_id, updates)
        except Exception as e:
            print(f"\n\n[SUPER AETHER ERROR]: Failed to update program {self.program_id}: {e}")

    def extract_code_block(self, content, language_hint):
        if not content:
            return ""
        # Try fenced blocks first
        fence = f"```{language_hint}"
        if fence in content:
            try:
                start = content.index(fence) + len(fence)
                end = content.index("```", start)
                return content[start:end].strip()
            except ValueError:
                pass
        # Try any fenced block
        if "```" in content:
            try:
                start = content.index("```") + 3
                end = content.index("```", start)
                return content[start:end].strip()
            except ValueError:
                pass
        # Fallback: return all content
        return content.strip()

    async def send_prompt_and_wait(self, conversation_id, prompt, timeout_seconds: int = 60):
        internal_prefix = "[**INTERNAL SYSTEM MESSAGE**]"
        poll_interval = 0.5
        start_time = datetime.now(timezone.utc)

        #print(f"\n\n[SUPER AETHER]: Sending prompt to rehtea: {prompt}")

        try:
            prev_history = await chats_crud.get_conversation_history(conversation_id, self.email)
            prev_len = len(prev_history) if prev_history else 0
        except Exception:
            prev_len = 0

        await thalisAPI(self.email).process(prompt, conversation_id)

        while (datetime.now(timezone.utc) - start_time).total_seconds() < timeout_seconds:
            try:
                history = await chats_crud.get_conversation_history(conversation_id, self.email)
            except Exception as e:
                print(f"\n\n[SUPER AETHER ERROR]: Failed to fetch conversation history: {e}")
                break

            if history and len(history) > prev_len:
                # Look for the first assistant message after our prompt
                for msg in history[prev_len:]:
                    if msg.get('role') == 'assistant':
                        content = (msg.get('content') or '').strip()
                        if content and not content.startswith(internal_prefix):
                            return content
            await asyncio.sleep(poll_interval)

        return ""

    async def add_message_to_conversation(self, conversation_id, content, role="user"):
        try:
            await chats_crud.add_message(conversation_id, content, role, self.email)
        except Exception as e:
            print(f"\n\n[SUPER AETHER ERROR]: Failed to add message to conversation: {e}")

    async def create_conversation(self):
        conversation_title_prefix = "hidden_chat_aether_"
        conversation_id = str(uuid.uuid4())
        try:
            user = await get_or_create_user(self.email)
            conv = Conversation(
                id=conversation_id,
                user_id=user.id,
                title=f"{conversation_title_prefix}{self.program_id}"
            )
            
            async with AsyncSessionLocal() as session:
                session.add(conv)
                await session.commit()
            return conversation_id
        except Exception as e:
            print(f"\n\n[SUPER AETHER ERROR]: Failed to create hidden aether conversation: {e}")
            raise

    async def clear_feedback(self):
        await self.update_program({'feedback': None})

    async def set_status(self, status_value):
        await self.update_program({
            'status': status_value,
            'updated_at': datetime.now(timezone.utc).isoformat()
        })

    async def fetch_program(self):
        try:
            program = await aether_crud.get_program(self.email, self.program_id)
            if not program:
                print(f"\n\n[SUPER AETHER ERROR]: Program {self.program_id} not found or access denied for user {self.email}")
            return program
        except Exception as e:
            print(f"\n\n[SUPER AETHER ERROR]: Failed to fetch program {self.program_id}: {e}")
            return None

    ############################################################

    async def run(self):
        try:
            if self.is_running and not self.stop_event.is_set():
                program = await self.fetch_program()

                await self.set_status('processing')
                await self.clear_feedback()

                conversation_id = await self.create_conversation()

                guidelines = aether_prompts.guidelines_prompt()
                program_context = aether_prompts.program_context(program)
                
                # Send guidelines and program context once to establish context (using CRUD)
                context_prompt = f"{guidelines}\n\n{program_context}\n\nYou are updating this program's code. Follow the rules strictly."
                await self.add_message_to_conversation(conversation_id, context_prompt)

                # Send task-specific prompts without repeating guidelines
                html_prompt = aether_prompts.get_html_prompt()
                css_prompt = aether_prompts.get_css_prompt()
                js_prompt = aether_prompts.get_js_prompt()

                html_resp = await self.send_prompt_and_wait(conversation_id, html_prompt)
                css_resp = await self.send_prompt_and_wait(conversation_id, css_prompt)
                js_resp = await self.send_prompt_and_wait(conversation_id, js_prompt)

                # Get existing source code to preserve unchanged parts
                source_code = program.get('source_code') or {}
                updated_source_code = {
                    'html': source_code.get('html', ''),
                    'css': source_code.get('css', ''),
                    'js': source_code.get('js', '')
                }

                # Check HTML response
                if html_resp and "NO CHANGES NEEDED FOR HTML" not in html_resp.upper():
                    html_code = self.extract_code_block(html_resp, 'html')
                    if html_code:
                        updated_source_code['html'] = html_code

                # Check CSS response
                if css_resp and "NO CHANGES NEEDED FOR CSS" not in css_resp.upper():
                    css_code = self.extract_code_block(css_resp, 'css')
                    if css_code:
                        updated_source_code['css'] = css_code

                # Check JS response
                if js_resp and "NO CHANGES NEEDED FOR JS" not in js_resp.upper():
                    js_code = self.extract_code_block(js_resp, 'javascript')
                    if js_code:
                        updated_source_code['js'] = js_code

                await self.update_program({'source_code': updated_source_code,'status': 'ready'})

                await self.delete_conversation(conversation_id)

        except Exception as e:
            print(f"\n\n[ERROR]: Error in superAether: {str(e)}")
        finally:
            await self.cleanup()


def run_environment(email, stop_event, attachment):
    try:
        program_data = {'id': attachment} if attachment else None
        if not program_data or not program_data.get('id'):
            print("[SUPER AETHER ERROR]: No program id provided to superAether")
            return

        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        processor = superAether(email, program_data, stop_event)
        loop.run_until_complete(processor.initialize())
        loop.run_until_complete(processor.run())
    except Exception as e:
        print(f"Error in superAether environment: {str(e)}")
    finally:
        try:
            loop.run_until_complete(loop.shutdown_asyncgens())
            loop.close()
        except:
            pass
