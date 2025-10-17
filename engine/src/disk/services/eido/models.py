from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship

from src.disk.core.db import Base


class EidoSetting(Base):
    __tablename__ = 'eido'

    id = Column(String, primary_key=True)
    user_id = Column(String, ForeignKey('users.id'))
    key_name = Column(String, nullable=False)
    key_value = Column(JSON)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Note: We intentionally do not set back_populates to avoid modifying User model.
    user = relationship('User')


