from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship

from src.disk.core.db import Base

class Setting(Base):
    __tablename__ = 'settings'
    id = Column(String, primary_key=True)
    user_id = Column(String, ForeignKey('users.id'))
    key_name = Column(String, nullable=False)
    key_value = Column(Text)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    user = relationship('User', back_populates='settings')
