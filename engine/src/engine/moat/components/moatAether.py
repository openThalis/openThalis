from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from src.disk.pythonDB.users.models import User
from src.disk.pythonDB.services.aether.models import Program
from src.disk.pythonDB.core.db import AsyncSessionLocal, init_db


class moatAether:
    def __init__(self):
        self.session = None

    async def __aenter__(self):
        await init_db()
        self.session = AsyncSessionLocal()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()

    async def read_aether_table(self):
        if not self.session:
            raise RuntimeError("moatAether must be used as async context manager")
        result = await self.session.execute(
            select(Program).options(selectinload(Program.user)).where(Program.status == "update").order_by(Program.created_at.desc())
        )
        programs = result.scalars().all()

        return [{
            'id': program.id,
            'user_email': program.user.email if program.user else None,
            'name': program.name,
            'description': program.description,
            'source_code': program.source_code,
            'status': program.status,
            'feedback': program.feedback,  # Include feedback column
            'created_at': program.created_at.isoformat() if program.created_at else None,
            'updated_at': program.updated_at.isoformat() if program.updated_at else None,
        } for program in programs]

    async def run(self):
        try:
            programs = await self.read_aether_table()
            return [program for program in programs if program['status'] == "update"]
        except Exception as e:
            print(f"\n\n### [MOAT AETHER ERROR]: Error running moatAether: {str(e)}")
            return []

