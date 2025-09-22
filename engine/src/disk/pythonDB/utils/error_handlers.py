from fastapi import HTTPException

def handle_service_error(e: Exception, default_code: int = 500):
    if isinstance(e, ValueError):
        raise HTTPException(status_code=404, detail=str(e))
    else:
        raise HTTPException(status_code=default_code, detail=str(e))