"""
Message router: send, retrieve, and update message status.
Handles message history and read receipts.
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models import User, Conversation, ConversationMember, Message
from app.schemas import MessageCreate, MessageResponse, MessageUpdateStatus
from app.auth import get_current_user


router = APIRouter(prefix="/messages", tags=["Messages"])


@router.get("/conversation/{conversation_id}", response_model=list[MessageResponse])
async def get_messages(
    conversation_id: int,
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get messages for a conversation with pagination.
    Verifies user is a member of the conversation.
    """
    # Verify membership
    membership = db.query(ConversationMember).filter(
        ConversationMember.conversation_id == conversation_id,
        ConversationMember.user_id == current_user.id
    ).first()
    
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not a member of this conversation"
        )
    
    messages = db.query(Message).filter(
        Message.conversation_id == conversation_id
    ).order_by(Message.created_at.desc()).offset(offset).limit(limit).all()
    
    # Reverse to get chronological order
    messages = list(reversed(messages))
    
    # Update last read message for this user
    if messages:
        last_msg_id = messages[-1].id
        membership.last_read_message_id = last_msg_id
        db.commit()
    
    return [MessageResponse.model_validate(m) for m in messages]


@router.post("", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
async def send_message(
    message_data: MessageCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Send a message to a conversation.
    Creates message with 'sent' status.
    """
    # Verify membership
    membership = db.query(ConversationMember).filter(
        ConversationMember.conversation_id == message_data.conversation_id,
        ConversationMember.user_id == current_user.id
    ).first()
    
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not a member of this conversation"
        )
    
    # Validate reply_to if provided
    if message_data.reply_to_id:
        reply_msg = db.query(Message).filter(
            Message.id == message_data.reply_to_id,
            Message.conversation_id == message_data.conversation_id
        ).first()
        
        if not reply_msg:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Reply message not found in this conversation"
            )
    
    # Create message
    new_message = Message(
        conversation_id=message_data.conversation_id,
        sender_id=current_user.id,
        content=message_data.content,
        message_type="text",
        status="sent",
        reply_to_id=message_data.reply_to_id,
        is_encrypted=True
    )
    
    db.add(new_message)
    db.commit()
    db.refresh(new_message)
    
    # Update conversation updated_at
    conversation = db.query(Conversation).filter(
        Conversation.id == message_data.conversation_id
    ).first()
    if conversation:
        conversation.updated_at = func.now()
        db.commit()
    
    return MessageResponse.model_validate(new_message)


@router.put("/{message_id}/status", response_model=MessageResponse)
async def update_message_status(
    message_id: int,
    status_data: MessageUpdateStatus,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update message status (delivered, read).
    Only the sender can update to 'sent' (already done), 
    recipients can update to 'delivered' or 'read'.
    """
    message = db.query(Message).filter(Message.id == message_id).first()
    
    if not message:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Message not found"
        )
    
    # Verify user is part of the conversation
    membership = db.query(ConversationMember).filter(
        ConversationMember.conversation_id == message.conversation_id,
        ConversationMember.user_id == current_user.id
    ).first()
    
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not a member of this conversation"
        )
    
    # Validate status transitions
    valid_transitions = {
        "sending": ["sent"],
        "sent": ["delivered", "read"],
        "delivered": ["read"]
    }
    
    current_status = message.status
    new_status = status_data.status
    
    if current_status not in valid_transitions or new_status not in valid_transitions.get(current_status, []):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status transition from {current_status} to {new_status}"
        )
    
    message.status = new_status
    db.commit()
    db.refresh(message)
    
    return MessageResponse.model_validate(message)


@router.get("/conversation/{conversation_id}/unread-count")
async def get_unread_count(
    conversation_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get unread message count for a specific conversation.
    """
    membership = db.query(ConversationMember).filter(
        ConversationMember.conversation_id == conversation_id,
        ConversationMember.user_id == current_user.id
    ).first()
    
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not a member of this conversation"
        )
    
    count = 0
    if membership.last_read_message_id:
        count = db.query(Message).filter(
            Message.conversation_id == conversation_id,
            Message.id > membership.last_read_message_id
        ).count()
    else:
        count = db.query(Message).filter(
            Message.conversation_id == conversation_id
        ).count()
    
    return {"conversation_id": conversation_id, "unread_count": count}