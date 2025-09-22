from fastapi import APIRouter, HTTPException, Depends, Query

from src.disk.pythonDB.core.security import get_current_user
from src.disk.pythonDB.services.settings.schemas import SettingsUpdateRequest, SettingCreateRequest, SettingRenameRequest
from src.disk.pythonDB.services.settings import crud
from src.disk.pythonDB.utils.error_handlers import handle_service_error

router = APIRouter()

@router.get("/settings")
async def get_settings(current_user: str = Depends(get_current_user)):
    try:
        settings_dict = await crud.get_settings_dict(current_user)
        return {"settings": settings_dict}
    except Exception as e:
        handle_service_error(e)

@router.get("/settings/list")
async def get_settings_list(current_user: str = Depends(get_current_user)):
    try:
        settings = await crud.get_user_settings(current_user)
        return {"settings": settings}
    except Exception as e:
        handle_service_error(e)

@router.put("/settings")
async def update_settings(settings_request: SettingsUpdateRequest, current_user: str = Depends(get_current_user)):
    try:
        success = await crud.update_user_settings(current_user, settings_request.settings)
        if not success:
            raise HTTPException(status_code=500, detail="Failed to update settings")
        return {"status": "success", "message": "Settings updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        handle_service_error(e)

@router.post("/settings")
async def create_setting(setting_request: SettingCreateRequest, current_user: str = Depends(get_current_user)):
    try:
        setting = await crud.create_setting(current_user, setting_request.key_name, setting_request.key_value)
        if not setting:
            raise HTTPException(status_code=500, detail="Failed to create setting")
        return {"setting": setting}
    except HTTPException:
        raise
    except Exception as e:
        handle_service_error(e)

@router.delete("/settings")
async def reset_settings(current_user: str = Depends(get_current_user)):
    try:
        success = await crud.delete_user_settings(current_user)
        if not success:
            raise HTTPException(status_code=500, detail="Failed to reset settings")
        return {"status": "success", "message": "Settings reset successfully"}
    except HTTPException:
        raise
    except Exception as e:
        handle_service_error(e)

@router.delete("/settings/item")
async def delete_setting(key_name: str = Query(..., min_length=1), current_user: str = Depends(get_current_user)):
    try:
        success = await crud.delete_setting(current_user, key_name)
        if not success:
            raise HTTPException(status_code=500, detail="Failed to delete setting")
        return {"status": "success", "message": "Setting deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        handle_service_error(e)

@router.post("/settings/rename")
async def rename_setting(req: SettingRenameRequest, current_user: str = Depends(get_current_user)):
    try:
        if req.new_key_name == 'LOCAL_PATH':
            raise HTTPException(status_code=400, detail="Cannot rename to reserved key name")
        success = await crud.rename_setting(current_user, req.old_key_name, req.new_key_name)
        if not success:
            raise HTTPException(status_code=400, detail="Rename failed: invalid source or destination exists")
        return {"status": "success", "message": "Setting renamed successfully"}
    except HTTPException:
        raise
    except Exception as e:
        handle_service_error(e)
