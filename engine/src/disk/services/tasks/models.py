from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, Text, ForeignKey, Boolean, JSON
from sqlalchemy.orm import relationship

from src.disk.core.db import Base


class Task(Base):
    __tablename__ = 'tasks'

    id = Column(String, primary_key=True)
    user_id = Column(String, ForeignKey('users.id'), nullable=False)
    user = relationship('User')

    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    assigned_agent = Column(String(255), nullable=True)
    schedule_summary = Column(String(255), nullable=True)
    running_status = Column(Boolean, nullable=False, default=False)
    responses = Column(JSON, nullable=True, default=list)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    last_run = Column(DateTime, nullable=True)


