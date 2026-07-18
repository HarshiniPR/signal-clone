"""
SQLAlchemy ORM models for the Signal Clone application.
Defines Users, Contacts, Conversations, ConversationMembers, Messages, and Sessions.
"""

from sqlalchemy import (
    Column, Integer, String, Boolean, DateTime, Text, ForeignKey, 
    Table, Index, UniqueConstraint, func
)
from sqlalchemy.orm import relationship, backref
from sqlalchemy.sql import expression
from datetime import datetime

from app.database import Base


# Association table for contacts (many-to-many self-referential)
class Contact(Base):
    """Contact relationship between users."""
    __tablename__ = "contacts"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    contact_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime, default=func.now())
    
    # Ensure no duplicate contacts
    __table_args__ = (
        UniqueConstraint('user_id', 'contact_id', name='unique_contact'),
        Index('idx_contacts_user', 'user_id'),
    )


class User(Base):
    """User model with authentication and profile fields."""
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    phone_number = Column(String(20), unique=True, nullable=False, index=True)
    display_name = Column(String(100), nullable=False)
    password_hash = Column(String(255), nullable=False)
    avatar_url = Column(String(500), nullable=True)
    status_message = Column(String(255), nullable=True, default="")
    is_online = Column(Boolean, default=False)
    last_seen_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    contacts = relationship(
        "User",
        secondary="contacts",
        primaryjoin="User.id==Contact.user_id",
        secondaryjoin="User.id==Contact.contact_id",
        backref="contacted_by"
    )
    
    sent_messages = relationship("Message", foreign_keys="Message.sender_id", back_populates="sender")
    conversation_memberships = relationship("ConversationMember", back_populates="user")
    sessions = relationship("Session", back_populates="user", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<User(id={self.id}, username={self.username}, display_name={self.display_name})>"


class Conversation(Base):
    """Conversation model for both direct and group chats."""
    __tablename__ = "conversations"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=True)  # Null for direct messages
    is_group = Column(Boolean, default=False, nullable=False)
    avatar_url = Column(String(500), nullable=True)
    created_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    members = relationship("ConversationMember", back_populates="conversation", cascade="all, delete-orphan")
    messages = relationship("Message", back_populates="conversation", cascade="all, delete-orphan", order_by="Message.created_at")
    creator = relationship("User", foreign_keys=[created_by])
    
    def __repr__(self):
        return f"<Conversation(id={self.id}, is_group={self.is_group}, name={self.name})>"


class ConversationMember(Base):
    """Association between users and conversations with role tracking."""
    __tablename__ = "conversation_members"
    
    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    role = Column(String(20), default="member", nullable=False)  # 'admin' or 'member'
    joined_at = Column(DateTime, default=func.now())
    last_read_message_id = Column(Integer, ForeignKey("messages.id", ondelete="SET NULL"), nullable=True)
    
    # Relationships
    conversation = relationship("Conversation", back_populates="members")
    user = relationship("User", back_populates="conversation_memberships")
    
    __table_args__ = (
        UniqueConstraint('conversation_id', 'user_id', name='unique_conversation_member'),
        Index('idx_conversation_members_user', 'user_id'),
    )


class Message(Base):
    """Message model with status tracking and reply support."""
    __tablename__ = "messages"
    
    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False)
    sender_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    content = Column(Text, nullable=False)
    message_type = Column(String(20), default="text", nullable=False)  # text, image, file
    status = Column(String(20), default="sending", nullable=False)  # sending, sent, delivered, read
    reply_to_id = Column(Integer, ForeignKey("messages.id", ondelete="SET NULL"), nullable=True)
    is_encrypted = Column(Boolean, default=True)  # Simulated encryption flag
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    conversation = relationship("Conversation", back_populates="messages")
    sender = relationship("User", foreign_keys=[sender_id], back_populates="sent_messages")
    reply_to = relationship("Message", remote_side=[id], backref="replies")
    
    __table_args__ = (
        Index('idx_messages_conversation', 'conversation_id', 'created_at'),
    )
    
    def __repr__(self):
        return f"<Message(id={self.id}, sender_id={self.sender_id}, status={self.status})>"


class Session(Base):
    """User session tracking for logout and security."""
    __tablename__ = "sessions"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    token_jti = Column(String(255), unique=True, nullable=False, index=True)  # JWT ID for revocation
    device_info = Column(String(255), nullable=True)
    ip_address = Column(String(45), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=func.now())
    expires_at = Column(DateTime, nullable=False)
    last_active_at = Column(DateTime, default=func.now())
    
    # Relationships
    user = relationship("User", back_populates="sessions")
    
    __table_args__ = (
        Index('idx_sessions_user', 'user_id'),
        Index('idx_sessions_token', 'token_jti'),
    )