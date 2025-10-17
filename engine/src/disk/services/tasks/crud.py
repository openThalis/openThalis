import uuid
from typing import List, Optional, Dict, Any
from sqlalchemy.future import select
from sqlalchemy.orm.attributes import flag_modified

from src.disk.core.db import AsyncSessionLocal
from src.disk.users.crud import get_or_create_user
from src.disk.services.tasks import models as task_models


def _serialize_task(task: task_models.Task) -> Dict[str, Any]:
    return {
        'id': task.id,
        'title': task.title,
        'description': task.description,
        'assigned_agent': task.assigned_agent,
        'schedule_summary': task.schedule_summary,
        'running_status': task.running_status,
        'responses': task.responses or [],
        'last_run': task.last_run.isoformat() if task.last_run else None,
        'created_at': task.created_at.isoformat() if task.created_at else None,
    }


async def create_task(email: str, data: Dict[str, Any]) -> Dict[str, Any]:
    async with AsyncSessionLocal() as session:
        user = await get_or_create_user(email)

        title = data.get('title', '').strip()
        description = data.get('description', '').strip() if data.get('description') else ''

        if not title:
            raise ValueError("Task title is required")
        if not description:
            raise ValueError("Task description is required")

        task = task_models.Task(
            id=str(uuid.uuid4()),
            user_id=user.id,
            title=data.get('title', '').strip(),
            description=data.get('description'),
            assigned_agent=data.get('assigned_agent'),
            schedule_summary=data.get('schedule_summary'),
            running_status=data.get('running_status', True),
            responses=data.get('responses', []),
            last_run=None
        )
        session.add(task)
        await session.commit()
        await session.refresh(task)
        return _serialize_task(task)


async def list_tasks(email: str) -> List[Dict[str, Any]]:
    async with AsyncSessionLocal() as session:
        user = await get_or_create_user(email)
        result = await session.execute(
            select(task_models.Task).where(task_models.Task.user_id == user.id).order_by(task_models.Task.created_at.desc())
        )
        tasks = result.scalars().all()
        return [_serialize_task(t) for t in tasks]


async def get_task(email: str, task_id: str) -> Optional[Dict[str, Any]]:
    async with AsyncSessionLocal() as session:
        user = await get_or_create_user(email)
        result = await session.execute(
            select(task_models.Task).where(task_models.Task.id == task_id, task_models.Task.user_id == user.id)
        )
        task = result.scalar_one_or_none()
        return _serialize_task(task) if task else None

async def update_task(email: str, task_id: str, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    async with AsyncSessionLocal() as session:
        user = await get_or_create_user(email)
        result = await session.execute(
            select(task_models.Task).where(task_models.Task.id == task_id, task_models.Task.user_id == user.id)
        )
        task = result.scalar_one_or_none()
        if not task:
            return None

        for key in [
            'title', 'description', 'assigned_agent', 'schedule_summary', 'running_status', 'responses'
        ]:
            if key in data and data[key] is not None:
                # Validate description is not empty when updating
                if key == 'description' and data[key].strip() == '':
                    raise ValueError("Task description cannot be empty")
                setattr(task, key, data[key])

        await session.commit()
        await session.refresh(task)
        return _serialize_task(task)


async def delete_task(email: str, task_id: str) -> bool:
    async with AsyncSessionLocal() as session:
        user = await get_or_create_user(email)
        result = await session.execute(
            select(task_models.Task).where(task_models.Task.id == task_id, task_models.Task.user_id == user.id)
        )
        task = result.scalar_one_or_none()
        if not task:
            return False
        await session.delete(task)
        await session.commit()
        return True


async def delete_task_response(email: str, task_id: str, response_index: int) -> Optional[Dict[str, Any]]:
    async with AsyncSessionLocal() as session:
        user = await get_or_create_user(email)
        result = await session.execute(
            select(task_models.Task).where(task_models.Task.id == task_id, task_models.Task.user_id == user.id)
        )
        task = result.scalar_one_or_none()
        if not task:
            return None

        if not task.responses or response_index < 0 or response_index >= len(task.responses):
            return None

        task.responses.pop(response_index)
        # Mark the JSON field as modified so SQLAlchemy knows to update it
        flag_modified(task, 'responses')

        await session.commit()
        await session.refresh(task)

        return _serialize_task(task)


