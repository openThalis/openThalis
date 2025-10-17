from datetime import datetime, timedelta, timezone
from fastapi import HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt


from src.disk.core.config import JWT_SECRET, JWT_ALGORITHM, JWT_EXPIRATION_MINUTES

security = HTTPBearer()

# JWT Token Creation
def create_access_token(email: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=JWT_EXPIRATION_MINUTES)
    to_encode = {"email": email, "exp": expire}
    return jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)

# JWT Token Verification
def verify_websocket_token(token: str) -> str:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        email: str = payload.get("email")
        if not email:
            raise ValueError("Invalid token")
        else:
            return email
    except jwt.ExpiredSignatureError:
        raise ValueError("Token expired")
    except jwt.PyJWTError:
        raise ValueError("Invalid token")

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)) -> str:
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        email: str = payload.get("email")
        if not email:
            raise HTTPException(status_code=401, detail="Invalid token")
        return email
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_current_user(email: str = Depends(verify_token)) -> str:
    from src.disk.users.crud import get_user
    user = await get_user(email)
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return email 