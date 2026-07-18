"""
User management router: profile updates, contacts, search, and settings.
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, func

from app.database import get_db
from app.models import User, Contact, Conversation, ConversationMember
from app.schemas import (
    UserResponse, UserUpdate, UserMinimal, ContactCreate, 
    ContactResponse, UserSettings, UserSettingsUpdate
)
from app.auth import get_current_user


router = APIRouter(prefix="/users", tags=["Users"])


@router.get("/search", response_model=list[UserMinimal])
async def search_users(
    q: str = Query(..., min_length=1, description="Search query for username or display name"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Search for users by username or display name.
    Excludes the current user from results.
    """
    users = db.query(User).filter(
        or_(
            User.username.ilike(f"%{q}%"),
            User.display_name.ilike(f"%{q}%")
        ),
        User.id != current_user.id
    ).limit(20).all()
    
    return [UserMinimal.model_validate(u) for u in users]


@router.get("/contacts", response_model=list[ContactResponse])
async def get_contacts(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all contacts for the current user.
    """
    contacts = db.query(Contact).filter(
        Contact.user_id == current_user.id
    ).all()
    
    result = []
    for contact in contacts:
        contact_user = db.query(User).filter(User.id == contact.contact_id).first()
        if contact_user:
            result.append(ContactResponse(
                id=contact.id,
                user_id=contact.user_id,
                contact_id=contact.contact_id,
                contact=UserMinimal.model_validate(contact_user),
                created_at=contact.created_at
            ))
    
    return result


@router.post("/contacts", response_model=ContactResponse, status_code=status.HTTP_201_CREATED)
async def add_contact(
    contact_data: ContactCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Add a new contact by username.
    Creates a bidirectional contact relationship.
    """
    # Find the user to add
    contact_user = db.query(User).filter(
        User.username == contact_data.contact_username
    ).first()
    
    if not contact_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    if contact_user.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot add yourself as a contact"
        )
    
    # Check if already contacts
    existing = db.query(Contact).filter(
        Contact.user_id == current_user.id,
        Contact.contact_id == contact_user.id
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Already in your contacts"
        )
    
    # Create bidirectional contact
    contact1 = Contact(user_id=current_user.id, contact_id=contact_user.id)
    contact2 = Contact(user_id=contact_user.id, contact_id=current_user.id)
    
    db.add(contact1)
    db.add(contact2)
    db.commit()
    
    # Refresh to get created_at
    db.refresh(contact1)
    
    return ContactResponse(
        id=contact1.id,
        user_id=contact1.user_id,
        contact_id=contact1.contact_id,
        contact=UserMinimal.model_validate(contact_user),
        created_at=contact1.created_at
    )


@router.delete("/contacts/{contact_id}")
async def remove_contact(
    contact_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Remove a contact by contact ID.
    Removes bidirectional relationship.
    """
    # Find the contact relationship
    contact = db.query(Contact).filter(
        Contact.user_id == current_user.id,
        Contact.contact_id == contact_id
    ).first()
    
    if not contact:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Contact not found"
        )
    
    # Remove both directions
    db.query(Contact).filter(
        (Contact.user_id == current_user.id) & (Contact.contact_id == contact_id) |
        (Contact.user_id == contact_id) & (Contact.contact_id == current_user.id)
    ).delete(synchronize_session=False)
    
    db.commit()
    
    return {"message": "Contact removed successfully"}


@router.get("/profile", response_model=UserResponse)
async def get_profile(current_user: User = Depends(get_current_user)):
    """
    Get current user's full profile.
    """
    return UserResponse.model_validate(current_user)


@router.put("/profile", response_model=UserResponse)
async def update_profile(
    update_data: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update current user's profile (display name, status, avatar).
    """
    if update_data.display_name is not None:
        current_user.display_name = update_data.display_name
    
    if update_data.status_message is not None:
        current_user.status_message = update_data.status_message
    
    if update_data.avatar_url is not None:
        current_user.avatar_url = update_data.avatar_url
    
    db.commit()
    db.refresh(current_user)
    
    return UserResponse.model_validate(current_user)


@router.get("/settings", response_model=UserSettings)
async def get_settings(current_user: User = Depends(get_current_user)):
    """
    Get user settings (placeholder implementation).
    In production, this would query a settings table.
    """
    # Return default settings (could be stored per user in DB)
    return UserSettings()


@router.put("/settings", response_model=UserSettings)
async def update_settings(
    settings_update: UserSettingsUpdate,
    current_user: User = Depends(get_current_user)
):
    """
    Update user settings (placeholder implementation).
    Returns updated settings object.
    """
    # In production, save to database
    current_settings = UserSettings()
    
    # Update only provided fields
    update_dict = settings_update.model_dump(exclude_unset=True)
    for key, value in update_dict.items():
        setattr(current_settings, key, value)
    
    return current_settings