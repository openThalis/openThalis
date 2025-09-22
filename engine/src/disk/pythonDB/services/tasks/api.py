from fastapi import APIRouter, HTTPException, Depends

from src.disk.pythonDB.core.security import get_current_user
from src.disk.pythonDB.services.tasks.schemas import TaskCreate, TaskUpdate
from src.disk.pythonDB.services.tasks import crud
from src.disk.pythonDB.utils.error_handlers import handle_service_error
from src.eido.utils.eido_config import fetch_default_agent, fetch_agents_dict


router = APIRouter()


@router.get("/tasks")
async def list_user_tasks(current_user: str = Depends(get_current_user)):
    try:
        tasks = await crud.list_tasks(current_user)
        return {"tasks": tasks}
    except Exception as e:
        handle_service_error(e)


@router.post("/tasks")
async def create_user_task(task: TaskCreate, current_user: str = Depends(get_current_user)):
    try:
        created = await crud.create_task(current_user, task.model_dump())
        return {"task": created}
    except Exception as e:
        handle_service_error(e)


@router.get("/tasks/agents")
async def get_available_agents(current_user: str = Depends(get_current_user)):
    try:
        agents_dict = await fetch_agents_dict(current_user)
        default_agent = await fetch_default_agent(current_user)
        
        return {
            "agents": agents_dict,
            "default_agent": default_agent
        }
    except Exception as e:
        handle_service_error(e)


@router.get("/tasks/{task_id}")
async def get_user_task(task_id: str, current_user: str = Depends(get_current_user)):
    try:
        task = await crud.get_task(current_user, task_id)
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")
        return {"task": task}
    except HTTPException:
        raise
    except Exception as e:
        handle_service_error(e)


@router.put("/tasks/{task_id}")
async def update_user_task(task_id: str, task_update: TaskUpdate, current_user: str = Depends(get_current_user)):
    try:
        updated = await crud.update_task(current_user, task_id, task_update.model_dump(exclude_unset=True))
        if not updated:
            raise HTTPException(status_code=404, detail="Task not found")
        return {"task": updated}
    except HTTPException:
        raise
    except Exception as e:
        handle_service_error(e)


@router.delete("/tasks/{task_id}")
async def delete_user_task(task_id: str, current_user: str = Depends(get_current_user)):
    try:
        success = await crud.delete_task(current_user, task_id)
        if not success:
            raise HTTPException(status_code=404, detail="Task not found")
        return {"status": "success"}
    except HTTPException:
        raise
    except Exception as e:
        handle_service_error(e)


@router.delete("/tasks/{task_id}/responses/{response_index}")
async def delete_user_task_response(task_id: str, response_index: int, current_user: str = Depends(get_current_user)):
    try:
        updated_task = await crud.delete_task_response(current_user, task_id, response_index)
        if not updated_task:
            raise HTTPException(status_code=404, detail="Task not found or response index out of range")
        return {"task": updated_task}
    except HTTPException:
        raise
    except Exception as e:
        handle_service_error(e)


