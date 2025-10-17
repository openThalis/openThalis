from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime
from sqlalchemy.orm import relationship

from src.disk.core.db import Base

class User(Base):
    __tablename__ = 'users'
    id = Column(String, primary_key=True)
    email = Column(String, unique=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    last_access_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships with other services
    conversations = relationship('Conversation', back_populates='user')
    settings = relationship('Setting', back_populates='user')
