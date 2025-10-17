from fastapi import APIRouter, HTTPException, Depends

from src.disk.core.security import get_current_user
from src.disk.services.aether.schemas import ProgramCreate, ProgramUpdate
from src.disk.services.aether import crud
from src.disk.utils.error_handlers import handle_service_error


router = APIRouter()


@router.get("/programs")
async def list_user_programs(current_user: str = Depends(get_current_user)):
    try:
        programs = await crud.list_programs(current_user)
        return {"programs": programs}
    except Exception as e:
        handle_service_error(e)


@router.post("/programs")
async def create_user_program(program: ProgramCreate, current_user: str = Depends(get_current_user)):
    try:
        created = await crud.create_program(current_user, program.model_dump())
        return {"program": created}
    except Exception as e:
        handle_service_error(e)


@router.get("/programs/{program_id}")
async def get_user_program(program_id: str, current_user: str = Depends(get_current_user)):
    try:
        program = await crud.get_program(current_user, program_id)
        if not program:
            raise HTTPException(status_code=404, detail="Program not found")
        return {"program": program}
    except HTTPException:
        raise
    except Exception as e:
        handle_service_error(e)


@router.put("/programs/{program_id}")
async def update_user_program(program_id: str, program_update: ProgramUpdate, current_user: str = Depends(get_current_user)):
    try:
        updated = await crud.update_program(current_user, program_id, program_update.model_dump(exclude_unset=True))
        if not updated:
            raise HTTPException(status_code=404, detail="Program not found")
        return {"program": updated}
    except HTTPException:
        raise
    except Exception as e:
        handle_service_error(e)


@router.delete("/programs/{program_id}")
async def delete_user_program(program_id: str, current_user: str = Depends(get_current_user)):
    try:
        success = await crud.delete_program(current_user, program_id)
        if not success:
            raise HTTPException(status_code=404, detail="Program not found")
        return {"status": "success"}
    except HTTPException:
        raise
    except Exception as e:
        handle_service_error(e)
