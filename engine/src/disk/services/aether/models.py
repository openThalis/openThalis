from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, Text, ForeignKey, JSON
from sqlalchemy.orm import relationship

from src.disk.core.db import Base


class Program(Base):
    __tablename__ = 'aether'

    id = Column(String, primary_key=True)
    user_id = Column(String, ForeignKey('users.id'), nullable=False)

    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    source_code = Column(JSON, nullable=True)
    status = Column(String(50), nullable=False, default='update')
    feedback = Column(Text, nullable=True)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # relationship to user (read-only, defined here to help joins)
    user = relationship('User')


