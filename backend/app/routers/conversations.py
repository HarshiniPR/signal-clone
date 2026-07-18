"""
Conversation router: create, list, manage conversations and group operations.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_
from typing import List, Optional

from app.database import get_db
from app.models import User, Conversation, ConversationMember, Message, Contact
from app.schemas import (
    ConversationResponse, ConversationCreate, GroupCreate, GroupUpdate,
    ConversationMemberResponse, MessageResponse
)
from app.auth import get_current_user


router = APIRouter(prefix="/conversations", tags=["Conversations"])


def get_conversation_with_details(
    db: Session, 
    conversation_id: int, 
    current_user_id: int
) -> Optional[ConversationResponse]:
    """
    Helper to build a ConversationResponse with unread count and last message.
    """
    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conv:
        return None
    
    # Count unread messages
    member = db.query(ConversationMember).filter(
        ConversationMember.conversation_id == conv.id,
        ConversationMember.user_id == current_user_id
    ).first()
    
    unread_count = 0
    if member and member.last_read_message_id:
        unread_count = db.query(Message).filter(
            Message.conversation_id == conv.id,
            Message.id > member.last_read_message_id
        ).count()
    elif member:
        # Never read any messages
        unread_count = db.query(Message).filter(
            Message.conversation_id == conv.id
        ).count()
    
    # Get last message
    last_msg = db.query(Message).filter(
        Message.conversation_id == conv.id
    ).order_by(Message.created_at.desc()).first()
    
    # Build members response
    members_response = []
    for m in conv.members:
        user = db.query(User).filter(User.id == m.user_id).first()
        if user:
            members_response.append(ConversationMemberResponse(
                id=m.id,
                user_id=m.user_id,
                role=m.role,
                joined_at=m.joined_at,
                user={
                    "id": user.id,
                    "username": user.username,
                    "display_name": user.display_name,
                    "avatar_url": user.avatar_url,
                    "is_online": user.is_online
                }
            ))
    
    # Determine conversation name for direct messages
    name = conv.name
    if not conv.is_group and not name:
        # Get the other user's name
        other_member = db.query(ConversationMember).filter(
            ConversationMember.conversation_id == conv.id,
            ConversationMember.user_id != current_user_id
        ).first()
        if other_member:
            other_user = db.query(User).filter(User.id == other_member.user_id).first()
            if other_user:
                name = other_user.display_name
    
    return ConversationResponse(
        id=conv.id,
        name=name,
        is_group=conv.is_group,
        avatar_url=conv.avatar_url,
        created_by=conv.created_by,
        created_at=conv.created_at,
        updated_at=conv.updated_at,
        members=members_response,
        unread_count=unread_count,
        last_message=MessageResponse.model_validate(last_msg) if last_msg else None
    )


@router.get("", response_model=List[ConversationResponse])
async def list_conversations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all conversations for the current user, sorted by most recent activity.
    Includes unread counts and last message previews.
    """
    # Get conversation IDs where user is a member
    member_records = db.query(ConversationMember).filter(
        ConversationMember.user_id == current_user.id
    ).all()
    
    conversation_ids = [m.conversation_id for m in member_records]
    
    if not conversation_ids:
        return []
    
    # Get conversations sorted by updated_at (most recent first)
    conversations = db.query(Conversation).filter(
        Conversation.id.in_(conversation_ids)
    ).order_by(Conversation.updated_at.desc()).all()
    
    result = []
    for conv in conversations:
        conv_response = get_conversation_with_details(db, conv.id, current_user.id)
        if conv_response:
            result.append(conv_response)
    
    return result


@router.post("/direct", response_model=ConversationResponse, status_code=status.HTTP_201_CREATED)
async def create_direct_conversation(
    conv_data: ConversationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a direct (one-on-one) conversation with another user.
    Checks if they are contacts first.
    """
    # Check if other user exists
    other_user = db.query(User).filter(User.id == conv_data.user_id).first()
    if not other_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    if other_user.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot create conversation with yourself"
        )
    
    # Check if they are contacts (optional - can be enforced)
    # contact = db.query(Contact).filter(
    #     Contact.user_id == current_user.id,
    #     Contact.contact_id == other_user.id
    # ).first()
    # if not contact:
    #     raise HTTPException(status_code=400, detail="Must be contacts first")
    
    # Check if conversation already exists
    existing = db.query(Conversation).join(ConversationMember).filter(
        Conversation.is_group == False,
        Conversation.id.in_(
            db.query(ConversationMember.conversation_id).filter(
                ConversationMember.user_id == current_user.id
            )
        )
    ).all()
    
    for conv in existing:
        members = db.query(ConversationMember).filter(
            ConversationMember.conversation_id == conv.id
        ).all()
        member_ids = [m.user_id for m in members]
        if current_user.id in member_ids and other_user.id in member_ids and len(member_ids) == 2:
            # Conversation already exists
            return get_conversation_with_details(db, conv.id, current_user.id)
    
    # Create new conversation
    new_conv = Conversation(
        is_group=False,
        created_by=current_user.id
    )
    db.add(new_conv)
    db.flush()
    
    # Add both members
    member1 = ConversationMember(
        conversation_id=new_conv.id,
        user_id=current_user.id,
        role="member"
    )
    member2 = ConversationMember(
        conversation_id=new_conv.id,
        user_id=other_user.id,
        role="member"
    )
    db.add(member1)
    db.add(member2)
    db.commit()
    
    return get_conversation_with_details(db, new_conv.id, current_user.id)


@router.post("/groups", response_model=ConversationResponse, status_code=status.HTTP_201_CREATED)
async def create_group(
    group_data: GroupCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a new group conversation with specified members.
    Creator becomes admin.
    """
    # Validate all member IDs exist
    members = db.query(User).filter(User.id.in_(group_data.member_ids)).all()
    if len(members) != len(group_data.member_ids):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="One or more member IDs are invalid"
        )
    
    # Create group
    new_group = Conversation(
        name=group_data.name,
        is_group=True,
        created_by=current_user.id
    )
    db.add(new_group)
    db.flush()
    
    # Add creator as admin
    creator_member = ConversationMember(
        conversation_id=new_group.id,
        user_id=current_user.id,
        role="admin"
    )
    db.add(creator_member)
    
    # Add other members
    for member in members:
        if member.id != current_user.id:
            m = ConversationMember(
                conversation_id=new_group.id,
                user_id=member.id,
                role="member"
            )
            db.add(m)
    
    db.commit()
    
    return get_conversation_with_details(db, new_group.id, current_user.id)


@router.get("/{conversation_id}", response_model=ConversationResponse)
async def get_conversation(
    conversation_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get a specific conversation by ID.
    Verifies user is a member.
    """
    # Check membership
    membership = db.query(ConversationMember).filter(
        ConversationMember.conversation_id == conversation_id,
        ConversationMember.user_id == current_user.id
    ).first()
    
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not a member of this conversation"
        )
    
    conv_response = get_conversation_with_details(db, conversation_id, current_user.id)
    if not conv_response:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found"
        )
    
    return conv_response


@router.put("/groups/{conversation_id}", response_model=ConversationResponse)
async def update_group(
    conversation_id: int,
    update_data: GroupUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update group name or avatar. Only admins can update.
    """
    # Check admin rights
    membership = db.query(ConversationMember).filter(
        ConversationMember.conversation_id == conversation_id,
        ConversationMember.user_id == current_user.id,
        ConversationMember.role == "admin"
    ).first()
    
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can update group details"
        )
    
    conv = db.query(Conversation).filter(
        Conversation.id == conversation_id,
        Conversation.is_group == True
    ).first()
    
    if not conv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group not found"
        )
    
    if update_data.name is not None:
        conv.name = update_data.name
    
    if update_data.avatar_url is not None:
        conv.avatar_url = update_data.avatar_url
    
    db.commit()
    db.refresh(conv)
    
    return get_conversation_with_details(db, conversation_id, current_user.id)


@router.post("/groups/{conversation_id}/members/{user_id}")
async def add_group_member(
    conversation_id: int,
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Add a member to a group. Only admins can add members.
    """
    # Check admin rights
    membership = db.query(ConversationMember).filter(
        ConversationMember.conversation_id == conversation_id,
        ConversationMember.user_id == current_user.id,
        ConversationMember.role == "admin"
    ).first()
    
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can add members"
        )
    
    # Check if group exists
    conv = db.query(Conversation).filter(
        Conversation.id == conversation_id,
        Conversation.is_group == True
    ).first()
    
    if not conv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group not found"
        )
    
    # Check if user exists
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Check if already a member
    existing = db.query(ConversationMember).filter(
        ConversationMember.conversation_id == conversation_id,
        ConversationMember.user_id == user_id
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is already a member"
        )
    
    # Add member
    new_member = ConversationMember(
        conversation_id=conversation_id,
        user_id=user_id,
        role="member"
    )
    db.add(new_member)
    db.commit()
    
    return {"message": "Member added successfully"}


@router.delete("/groups/{conversation_id}/members/{user_id}")
async def remove_group_member(
    conversation_id: int,
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Remove a member from a group. Admins can remove anyone; members can remove themselves.
    """
    # Check if user is removing themselves or is admin
    is_self = user_id == current_user.id
    
    if not is_self:
        membership = db.query(ConversationMember).filter(
            ConversationMember.conversation_id == conversation_id,
            ConversationMember.user_id == current_user.id,
            ConversationMember.role == "admin"
        ).first()
        
        if not membership:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only admins can remove other members"
            )
    
    # Find member to remove
    member_to_remove = db.query(ConversationMember).filter(
        ConversationMember.conversation_id == conversation_id,
        ConversationMember.user_id == user_id
    ).first()
    
    if not member_to_remove:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Member not found in group"
        )
    
    # Prevent removing the last admin
    if member_to_remove.role == "admin":
        admin_count = db.query(ConversationMember).filter(
            ConversationMember.conversation_id == conversation_id,
            ConversationMember.role == "admin"
        ).count()
        
        if admin_count <= 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot remove the last admin"
            )
    
    db.delete(member_to_remove)
    db.commit()
    
    return {"message": "Member removed successfully"}