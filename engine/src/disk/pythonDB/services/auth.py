
import re
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.exc import IntegrityError

from src.disk.pythonDB.users import crud as user_crud
from src.disk.pythonDB.core.security import create_access_token, get_current_user

class LoginRequest(BaseModel):
    email: str 

router = APIRouter()

@router.post("/login")
async def login(request: LoginRequest):
    try:
        _ = await user_crud.get_or_create_user(request.email)
        access_token = create_access_token(request.email)
        return {
            "status": "success",
            "email": request.email,
            "access_token": access_token,
            "token_type": "bearer"
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/register")
async def register(request: LoginRequest):
    try:
        _ = await user_crud.create_new_user(request.email)
        access_token = create_access_token(request.email)
        return {
            "status": "success",
            "email": request.email,
            "access_token": access_token,
            "token_type": "bearer"
        }
    except ValueError as e:
        if "already exists" in str(e):
            raise HTTPException(
                status_code=409,
                detail="A user with this email already exists."
            )
        else:
            raise HTTPException(status_code=400, detail=str(e))
    except IntegrityError as e:
        if "unique constraint" in str(e).lower() or "duplicate" in str(e).lower():
            raise HTTPException(
                status_code=409,
                detail="A user with this email already exists."
            )
        else:
            raise HTTPException(status_code=400, detail="Database constraint violation")
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/verify")
async def verify_token_endpoint(current_user: str = Depends(get_current_user)):
    return {"status": "success", "email": current_user}

@router.get("/users")
async def get_all_users():
    try:
        users = await user_crud.get_all_users()
        emails = [user.email for user in users]
        return {"status": "success", "emails": emails}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/users/{email}")
async def rename_user(email: str, request: dict):
    try:
        new_email = request.get("new_email")
        if not new_email:
            raise HTTPException(status_code=400, detail="new instance name is required")
        

        instance_name_pattern = r'^[a-zA-Z0-9\s\-_]+$'
        if not re.match(instance_name_pattern, new_email):
            raise HTTPException(status_code=400, detail="Instance name can only contain letters, numbers, spaces, hyphens, and underscores")
        
        if len(new_email.strip()) < 2 or len(new_email.strip()) > 50:
            raise HTTPException(status_code=400, detail="Instance name must be between 2 and 50 characters")
        
        if email == new_email:
            raise HTTPException(status_code=400, detail="New instance name must be different from current instance name")
        
        await user_crud.rename_user(email, new_email)
        return {"status": "success", "message": f"Instance {email} renamed to {new_email} successfully"}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to rename user: {str(e)}")

@router.delete("/users/{email}")
async def delete_user(email: str):
    try:
        await user_crud.delete_user(email)
        return {"status": "success", "message": f"User {email} and all associated data deleted successfully"}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete user: {str(e)}")

@router.post("/logout")
async def logout():
    return {"status": "success", "message": "Logged out successfully"} 