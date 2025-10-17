from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base
import os

Base = declarative_base()

# Configure the database URI (SQLite file in project root by default)
_current_dir = os.path.dirname(os.path.abspath(__file__))
_db_path = os.path.join(os.path.dirname(_current_dir), 'database.db')
DATABASE_URI = f"sqlite+aiosqlite:///{_db_path.replace(os.sep, '/')}"

# Async engine & session factory
engine = create_async_engine(DATABASE_URI, future=True, echo=False)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

async def init_db():
    # Import models from all services so that they are registered with Base
    # pylint: disable=import-error, unused-import
    from src.disk.users import models as _user_models  # noqa: F401
    from src.disk.services.chats import models as _chat_models  # noqa: F401
    from src.disk.services.settings import models as _settings_models  # noqa: F401
    from src.disk.services.eido import models as _eido_models  # noqa: F401
    from src.disk.services.tasks import models as _tasks_models  # noqa: F401
    from src.disk.services.aether import models as _aether_models  # noqa: F401
    # Add future service model imports here
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all) 