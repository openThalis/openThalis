from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, Enum, ForeignKey, Text
from sqlalchemy.orm import relationship

from src.disk.core.db import Base

class Conversation(Base):
    __tablename__ = 'chats_conversations'
    id = Column(String, primary_key=True)
    user_id = Column(String, ForeignKey('users.id'))
    title = Column(String)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    user = relationship('User', back_populates='conversations')
    messages = relationship('Message', back_populates='conversation')

class Message(Base):
    __tablename__ = 'chats_messages'
    id = Column(String, primary_key=True)
    conversation_id = Column(String, ForeignKey('chats_conversations.id'))
    sender = Column(Enum('user', 'system', 'assistant', name='sender_types'))
    content = Column(Text)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    conversation = relationship('Conversation', back_populates='messages') 