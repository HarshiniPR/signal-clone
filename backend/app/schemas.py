"""
Pydantic schemas for request/response validation and serialization.
"""

from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime


# ==================== USER SCHEMAS ====================

class UserBase(BaseModel):
    """Base user fields."""
    username: str = Field(..., min_length=3, max_length=50)
    phone_number: str = Field(..., min_length=5, max_length=20)
    display_name: str = Field(..., min_length=1, max_length=100)


class UserCreate(UserBase):
    """Schema for user registration."""
    password: str = Field(..., min_length=6, max_length=100)


class UserLogin(BaseModel):
    """Schema for user login."""
    username: str
    password: str


class UserUpdate(BaseModel):
    """Schema for updating user profile."""
    display_name: Optional[str] = Field(None, min_length=1, max_length=100)
    status_message: Optional[str] = Field(None, max_length=255)
    avatar_url: Optional[str] = None


class UserResponse(UserBase):
    """Schema for user data in responses."""
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    avatar_url: Optional[str] = None
    status_message: Optional[str] = None
    is_online: bool
    last_seen_at: Optional[datetime] = None
    created_at: datetime


class UserMinimal(BaseModel):
    """Minimal user info for lists."""
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    username: str
    display_name: str
    avatar_url: Optional[str] = None
    is_online: bool


# ==================== CONTACT SCHEMAS ====================

class ContactCreate(BaseModel):
    """Schema for adding a contact."""
    contact_username: str = Field(..., min_length=1)


class ContactResponse(BaseModel):
    """Schema for contact in response."""
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    user_id: int
    contact_id: int
    contact: UserMinimal
    created_at: datetime


# ==================== AUTH SCHEMAS ====================

class TokenResponse(BaseModel):
    """Schema for JWT token response."""
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserResponse


class OTPRequest(BaseModel):
    """Schema for OTP request."""
    phone_number: str


class OTPVerify(BaseModel):
    """Schema for OTP verification."""
    phone_number: str
    otp: str = Field(..., min_length=6, max_length=6)


# ==================== CONVERSATION SCHEMAS ====================

class ConversationCreate(BaseModel):
    """Schema for creating a direct conversation."""
    user_id: int  # Other user's ID


class GroupCreate(BaseModel):
    """Schema for creating a group."""
    name: str = Field(..., min_length=1, max_length=100)
    member_ids: List[int] = Field(..., min_length=1)


class GroupUpdate(BaseModel):
    """Schema for updating group."""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    avatar_url: Optional[str] = None


class ConversationMemberResponse(BaseModel):
    """Schema for conversation member."""
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    user_id: int
    role: str
    joined_at: datetime
    user: UserMinimal


class ConversationResponse(BaseModel):
    """Schema for conversation in response."""
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    name: Optional[str]
    is_group: bool
    avatar_url: Optional[str]
    created_by: Optional[int]
    created_at: datetime
    updated_at: datetime
    members: List[ConversationMemberResponse]
    unread_count: int = 0
    last_message: Optional['MessageResponse'] = None


# ==================== MESSAGE SCHEMAS ====================

class MessageCreate(BaseModel):
    """Schema for creating a message."""
    content: str = Field(..., min_length=1, max_length=4000)
    conversation_id: int
    reply_to_id: Optional[int] = None


class MessageUpdateStatus(BaseModel):
    """Schema for updating message status."""
    status: str = Field(..., pattern="^(sent|delivered|read)$")


class MessageResponse(BaseModel):
    """Schema for message in response."""
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    conversation_id: int
    sender_id: int
    sender: UserMinimal
    content: str
    message_type: str
    status: str
    reply_to_id: Optional[int] = None
    reply_to: Optional['MessageResponse'] = None
    is_encrypted: bool
    created_at: datetime
    updated_at: datetime


class TypingIndicator(BaseModel):
    """Schema for typing indicator events."""
    conversation_id: int
    user_id: int
    is_typing: bool


# ==================== WEBSOCKET SCHEMAS ====================

class WebSocketMessage(BaseModel):
    """Schema for WebSocket message events."""
    type: str  # 'message', 'typing', 'status', 'read_receipt'
    payload: dict


# ==================== SETTINGS SCHEMAS ====================

class UserSettings(BaseModel):
    """Schema for user settings (placeholder)."""
    privacy_level: str = "standard"
    notifications_enabled: bool = True
    dark_mode: bool = False
    sound_enabled: bool = True
    read_receipts_enabled: bool = True
    typing_indicators_enabled: bool = True


class UserSettingsUpdate(BaseModel):
    """Schema for updating user settings."""
    privacy_level: Optional[str] = None
    notifications_enabled: Optional[bool] = None
    dark_mode: Optional[bool] = None
    sound_enabled: Optional[bool] = None
    read_receipts_enabled: Optional[bool] = None
    typing_indicators_enabled: Optional[bool] = None


# Forward reference resolution
ConversationResponse.model_rebuild()
MessageResponse.model_rebuild()