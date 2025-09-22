from fastapi import APIRouter, HTTPException, Depends, Query

from src.disk.pythonDB.core.security import get_current_user
from src.disk.pythonDB.services.eido.schemas import (
    EidoSettingsUpdateRequest,
    EidoSettingCreateRequest,
)
from src.disk.pythonDB.services.eido import crud
from src.disk.pythonDB.utils.error_handlers import handle_service_error


router = APIRouter()


@router.get("/eido")
async def get_eido_settings(current_user: str = Depends(get_current_user)):
    """Get all eido settings for the current user"""
    try:
        settings_dict = await crud.get_eido_settings_dict(current_user)
        return {"settings": settings_dict}
    except Exception as e:
        handle_service_error(e)


@router.get("/eido/list")
async def get_eido_settings_list(current_user: str = Depends(get_current_user)):
    """Get all eido settings as a list for the current user"""
    try:
        settings = await crud.get_user_eido_settings(current_user)
        return {"settings": settings}
    except Exception as e:
        handle_service_error(e)


@router.put("/eido")
async def update_eido_settings(
    settings_request: EidoSettingsUpdateRequest,
    current_user: str = Depends(get_current_user),
):
    """Update multiple eido settings for the current user"""
    try:
        success = await crud.update_user_eido_settings(current_user, settings_request.settings)
        if not success:
            raise HTTPException(status_code=500, detail="Failed to update eido settings")
        return {"status": "success", "message": "Eido settings updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        handle_service_error(e)


@router.post("/eido")
async def create_eido_setting(
    setting_request: EidoSettingCreateRequest, current_user: str = Depends(get_current_user)
):
    """Create a single eido setting"""
    try:
        setting = await crud.create_eido_setting(
            current_user, setting_request.key_name, setting_request.key_value
        )
        if not setting:
            raise HTTPException(status_code=500, detail="Failed to create eido setting")
        return {"setting": setting}
    except HTTPException:
        raise
    except Exception as e:
        handle_service_error(e)


@router.delete("/eido")
async def reset_eido_settings(current_user: str = Depends(get_current_user)):
    """Delete all eido settings for the current user (reset functionality)"""
    try:
        success = await crud.delete_user_eido_settings(current_user)
        if not success:
            raise HTTPException(status_code=500, detail="Failed to reset eido settings")
        return {"status": "success", "message": "Eido settings reset successfully"}
    except HTTPException:
        raise
    except Exception as e:
        handle_service_error(e)


@router.delete("/eido/item")
async def delete_eido_setting(
    key_name: str = Query(..., min_length=1),
    current_user: str = Depends(get_current_user),
):
    """Delete a single eido setting (by key name) for the current user"""
    try:
        success = await crud.delete_agent_entry(current_user, key_name)
        if not success:
            raise HTTPException(status_code=500, detail="Failed to delete eido setting")
        return {"status": "success", "message": "Eido setting deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        handle_service_error(e)




