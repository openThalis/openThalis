import uuid
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
from sqlalchemy.future import select

from src.disk.core.db import AsyncSessionLocal
from src.disk.users.crud import get_or_create_user
from src.disk.services.aether import models as program_models


def _serialize_program(program: program_models.Program) -> Dict[str, Any]:
    return {
        'id': program.id,
        'name': program.name,
        'description': program.description,
        'source_code': program.source_code,
        'status': program.status,
        'feedback': program.feedback,
        'created_at': program.created_at.isoformat() if program.created_at else None,
        'updated_at': program.updated_at.isoformat() if program.updated_at else None,
    }


async def create_program(email: str, data: Dict[str, Any]) -> Dict[str, Any]:
    async with AsyncSessionLocal() as session:
        user = await get_or_create_user(email)
        
        program = program_models.Program(
            id=str(uuid.uuid4()),
            user_id=user.id,
            name=data.get('name', '').strip(),
            description=data.get('description', '').strip(),
            source_code=data.get('source_code'),
            status=data.get('status', 'update'),
            feedback=data.get('feedback'),
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc)
            )
        session.add(program)
        await session.commit()
        await session.refresh(program)
        return _serialize_program(program)


async def list_programs(email: str) -> List[Dict[str, Any]]:
    async with AsyncSessionLocal() as session:
        user = await get_or_create_user(email)
        result = await session.execute(
            select(program_models.Program).where(program_models.Program.user_id == user.id).order_by(program_models.Program.updated_at.desc())
        )
        programs = result.scalars().all()
        return [_serialize_program(p) for p in programs]


async def get_program(email: str, program_id: str) -> Optional[Dict[str, Any]]:
    async with AsyncSessionLocal() as session:
        user = await get_or_create_user(email)
        result = await session.execute(
            select(program_models.Program).where(program_models.Program.id == program_id, program_models.Program.user_id == user.id)
        )
        program = result.scalar_one_or_none()
        return _serialize_program(program) if program else None


async def update_program(email: str, program_id: str, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    async with AsyncSessionLocal() as session:
        user = await get_or_create_user(email)
        result = await session.execute(
            select(program_models.Program).where(program_models.Program.id == program_id, program_models.Program.user_id == user.id)
        )
        program = result.scalar_one_or_none()
        if not program:
            return None

        # Apply updates
        for key in ['name', 'description', 'source_code', 'config', 'status', 'feedback']:
            if key in data:
                # For name and description, don't allow null/empty values
                if key in ['name', 'description'] and (data[key] is None or not str(data[key]).strip()):
                    continue
                # For other fields, allow null/empty to clear them
                setattr(program, key, data[key])
        
        # Update timestamp
        program.updated_at = datetime.now(timezone.utc)

        await session.commit()
        await session.refresh(program)
        return _serialize_program(program)


async def delete_program(email: str, program_id: str) -> bool:
    async with AsyncSessionLocal() as session:
        user = await get_or_create_user(email)
        result = await session.execute(
            select(program_models.Program).where(program_models.Program.id == program_id, program_models.Program.user_id == user.id)
        )
        program = result.scalar_one_or_none()
        if not program:
            return False
        await session.delete(program)
        await session.commit()
        return True
