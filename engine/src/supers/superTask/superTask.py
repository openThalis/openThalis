import uuid
import asyncio
import threading
from sqlalchemy import update
from sqlalchemy.future import select
from src.api.thalisAPI import thalisAPI
from datetime import datetime, timezone
from src.disk.pythonDB.core.db import AsyncSessionLocal
from src.disk.pythonDB.services.tasks.models import Task
from src.disk.pythonDB.users.crud import get_or_create_user
from src.disk.pythonDB.services.chats import crud as chats_crud
from src.disk.pythonDB.services.chats.models import Conversation

class superTask():
    def __init__(self, email, task_data, stop_event: threading.Event):
        self.email = email
        self.task_data = task_data
        self.task_id = task_data.get('id') if task_data else None

        self._is_running = False
        self._stop_event = stop_event

    async def initialize(self):
        self._is_running = True
        return self
 
    async def cleanup(self):
        self._is_running = False

    async def update_last_run_timestamp(self):
        async with AsyncSessionLocal() as session:
            user = await get_or_create_user(self.email)

            await session.execute(
                update(Task).where(Task.id == self.task_id, Task.user_id == user.id).values(
                    last_run=datetime.now(timezone.utc)
                )
            )
            await session.commit()

    ##############################

    async def delete_conversation(self, conversation_id):
        try:
            success = await chats_crud.delete_conversation(conversation_id, self.email)
            if success:
                #print(f"\n\n### [SUPER TASK]: Deleted conversation {conversation_id}")
                pass
            else:
                print(f"\n\n### [SUPER TASK]: Conversation {conversation_id} not found or already deleted")
        except Exception as e:
            print(f"\n\n### [ERROR]: Failed to delete conversation {conversation_id}: {e}")

    async def add_response_to_task(self, response_message):
        async with AsyncSessionLocal() as session:
            # Get user for validation
            user = await get_or_create_user(self.email)

            # Get task with user ownership validation
            result = await session.execute(
                select(Task).where(Task.id == self.task_id, Task.user_id == user.id)
            )
            task = result.scalar_one_or_none()

            if task:
                # Append new response to existing responses
                current_responses = task.responses or []
                current_responses.append({
                    'datetime': datetime.now(timezone.utc).isoformat(),
                    'response': response_message
                })

                # Update the task with user ownership validation (last_run already updated at start)
                await session.execute(
                    update(Task).where(Task.id == self.task_id, Task.user_id == user.id).values(
                        responses=current_responses
                    )
                )
                await session.commit()
            else:
                print(f"### [ERROR]: Task {self.task_id} not found or access denied for user {self.email}")

    async def get_eido_response(self, conversation_id):
        async def sanitize_eido_response(response):
            if isinstance(response, str):
                return response.replace('"', "'")
            return response

        internal_prefix = "[**INTERNAL SYSTEM MESSAGE**]"
        timeout_seconds = 60
        poll_interval = 0.5
        stability_wait = 10
        start_time = datetime.now(timezone.utc)

        assistant_chunks = []
        last_message_time = start_time
        stable_chunks = []

        while (datetime.now(timezone.utc) - start_time).total_seconds() < timeout_seconds:
            try:
                history = await chats_crud.get_conversation_history(conversation_id, self.email)
            except Exception as e:
                print(f"\n\n### [ERROR]: Failed to fetch conversation history for {conversation_id}: {e}")
                break

            if history and len(history) > 1:
                # Skip the first message (user input we sent)
                collected = []
                for msg in history[1:]:
                    if msg.get('role') == 'assistant':
                        content = msg.get('content') or ''
                        if content.startswith(internal_prefix):
                            continue
                        if content.strip():
                            collected.append(content)

                # Check if we have new messages
                if collected != stable_chunks:
                    stable_chunks = collected
                    last_message_time = datetime.now(timezone.utc)
                    assistant_chunks = collected
                elif collected and (datetime.now(timezone.utc) - last_message_time).total_seconds() >= stability_wait:
                    # Messages haven't changed for stability_wait seconds, conversation likely complete
                    break

            await asyncio.sleep(poll_interval)

        merged = "\n\n".join(assistant_chunks).strip() or "No response from assistant"
        return await sanitize_eido_response(merged)
        
    async def task_eido(self, conversation_id):
        agent_name = self.task_data.get('assigned_agent', 'Unknown Agent') if self.task_data else 'Unknown Agent'
        task_title = self.task_data.get('title', 'Unknown Task') if self.task_data else 'Unknown Task'
        task_description = self.task_data.get('description', 'No description') if self.task_data else 'No description'
        
        #print(f"\n\n### [SUPER TASK]: '{agent_name}' is executing task '{task_title}' with description '{task_description}'")

        suffix_prompt = "If task requires a tool use, DO NOT provide a response right away in your from, use the tool first."
        task_prompt = f"@{agent_name} You have been given the task '{task_title}' with the description '{task_description}'." + suffix_prompt
        await thalisAPI(self.email).process(task_prompt, conversation_id)

    async def create_conversation(self):
        conversation_title_prefix = "hidden_chat_task_"
        conversation_id = str(uuid.uuid4())
        try:
            async with AsyncSessionLocal() as session:
                user = await get_or_create_user(self.email)
                conv = Conversation(
                    id=conversation_id,
                    user_id=user.id,
                    title=f"{conversation_title_prefix}{self.task_id}"
                )
                session.add(conv)
                await session.commit()
            return conversation_id
        except Exception as e:
            print(f"\n\n### [ERROR]: Failed to create hidden task conversation: {e}")
            raise

    ##############################

    async def turn_off_task(self):
        async with AsyncSessionLocal() as session:
            # Get user for validation
            user = await get_or_create_user(self.email)

            # Update task running status to False with user ownership validation
            result = await session.execute(
                update(Task).where(Task.id == self.task_id, Task.user_id == user.id).values(
                    running_status=False
                )
            )

            if result.rowcount > 0:
                await session.commit()
                #print(f"\n\n### [SUPER TASK]: Turning task {self.task_id} status OFF")
            else:
                print(f"### [ERROR]: Task {self.task_id} not found or access denied for user {self.email}")

    async def get_task_schedule_summary(self):
        schedule_summary = self.task_data.get('schedule_summary', 'No schedule summary') if self.task_data else 'No schedule summary'
        return schedule_summary
    
    ##############################

    async def run(self):
        try:
            if self._is_running and not self._stop_event.is_set():

                schedule_summary = await self.get_task_schedule_summary()

                current_task = None
                try:
                    async with AsyncSessionLocal() as session:
                        user = await get_or_create_user(self.email)
                        result = await session.execute(
                            select(Task).where(Task.id == self.task_id, Task.user_id == user.id)
                        )
                        current_task = result.scalar_one_or_none()
                except Exception as e:
                    print(f"\n\n### [ERROR]: Failed to fetch task data for {self.task_id}: {e}")
                    return

                if not current_task:
                    print(f"\n\n### [ERROR]: Task {self.task_id} not found or access denied")
                    return

                await self.update_last_run_timestamp()
                
                conversation_id = await self.create_conversation()
                await self.task_eido(conversation_id)
                response_message = await self.get_eido_response(conversation_id)
                await self.add_response_to_task(response_message)
                await self.delete_conversation(conversation_id)

                if schedule_summary == "NOW" or schedule_summary.startswith("ONCE"):
                    await self.turn_off_task()


        except Exception as e:
            print(f"\n\n### [ERROR]: Error in superTask: {str(e)}")
        finally:
            await self.cleanup()


def run_environment(email, stop_event, attachment):
    try:
        task_data = None
        if attachment and "|" in attachment:
            parts = attachment.split("|", 4)  # Split into max 5 parts
            if len(parts) >= 5:
                task_data = {
                    'id': parts[0],
                    'title': parts[1],
                    'description': parts[2],
                    'assigned_agent': parts[3],
                    'schedule_summary': parts[4]
                }
        else:
            task_data = {'id': attachment} if attachment else None

        if not task_data or not task_data.get('id'):
            print("### [ERROR]: No task data provided to superTask")
            return

        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)

        processor = superTask(email, task_data, stop_event)
        loop.run_until_complete(processor.initialize())
        loop.run_until_complete(processor.run())

    except Exception as e:
        print(f"### [ERROR]: Error in superTask environment: {str(e)}")
    finally:
        try:
            loop.run_until_complete(loop.shutdown_asyncgens())
            loop.close()
        except:
            pass