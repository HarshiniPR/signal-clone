"""
Database seeding script to populate the application with sample data.
Creates users, contacts, conversations, and messages for immediate usability.
"""

from sqlalchemy.orm import Session
from datetime import datetime, timezone
from app.database import SessionLocal, engine, Base
from app.models import User, Contact, Conversation, ConversationMember, Message
from app.auth import get_password_hash
import random


def create_seed_data():
    """
    Seed the database with sample users, contacts, conversations, and messages.
    Makes the app immediately usable after first run.
    """
    db = SessionLocal()
    
    try:
        # Check if already seeded
        existing = db.query(User).first()
        if existing:
            print("Database already seeded. Skipping...")
            return
        
        print("Seeding database...")
        
        # Create sample users
        users_data = [
            {
                "username": "alice",
                "phone_number": "+1234567890",
                "display_name": "Alice Johnson",
                "password": "password123",
                "status_message": "Hey there! I'm using Signal Clone.",
                "is_online": True,
            },
            {
                "username": "bob",
                "phone_number": "+1234567891",
                "display_name": "Bob Smith",
                "password": "password123",
                "status_message": "Available",
                "is_online": False,
                "last_seen_at": datetime.now(timezone.utc),
            },
            {
                "username": "charlie",
                "phone_number": "+1234567892",
                "display_name": "Charlie Brown",
                "password": "password123",
                "status_message": "At work",
                "is_online": True,
            },
            {
                "username": "diana",
                "phone_number": "+1234567893",
                "display_name": "Diana Prince",
                "password": "password123",
                "status_message": "Wondering...",
                "is_online": False,
                "last_seen_at": datetime.now(timezone.utc),
            },
            {
                "username": "eve",
                "phone_number": "+1234567894",
                "display_name": "Eve Online",
                "password": "password123",
                "status_message": "Hacking away",
                "is_online": True,
            },
        ]
        
        users = []
        for user_data in users_data:
            user = User(
                username=user_data["username"],
                phone_number=user_data["phone_number"],
                display_name=user_data["display_name"],
                password_hash=get_password_hash(user_data["password"]),
                status_message=user_data["status_message"],
                is_online=user_data["is_online"],
                last_seen_at=user_data.get("last_seen_at"),
            )
            db.add(user)
            users.append(user)
        
        db.commit()
        for user in users:
            db.refresh(user)
        
        print(f"Created {len(users)} users")
        
        # Create contacts (mutual friendships)
        contact_pairs = [
            (users[0], users[1]),  # Alice <-> Bob
            (users[0], users[2]),  # Alice <-> Charlie
            (users[0], users[3]),  # Alice <-> Diana
            (users[1], users[2]),  # Bob <-> Charlie
            (users[2], users[4]),  # Charlie <-> Eve
        ]
        
        for user1, user2 in contact_pairs:
            contact1 = Contact(user_id=user1.id, contact_id=user2.id)
            contact2 = Contact(user_id=user2.id, contact_id=user1.id)
            db.add(contact1)
            db.add(contact2)
        
        db.commit()
        print(f"Created {len(contact_pairs) * 2} contact relationships")
        
        # Create direct conversations
        direct_pairs = [
            (users[0], users[1]),  # Alice - Bob
            (users[0], users[2]),  # Alice - Charlie
            (users[0], users[3]),  # Alice - Diana
        ]
        
        conversations = []
        for user1, user2 in direct_pairs:
            conv = Conversation(
                is_group=False,
                created_by=user1.id,
            )
            db.add(conv)
            db.flush()
            
            # Add both members
            member1 = ConversationMember(
                conversation_id=conv.id,
                user_id=user1.id,
                role="member"
            )
            member2 = ConversationMember(
                conversation_id=conv.id,
                user_id=user2.id,
                role="member"
            )
            db.add(member1)
            db.add(member2)
            conversations.append(conv)
        
        # Create a group conversation
        group_conv = Conversation(
            name="Weekend Plans",
            is_group=True,
            created_by=users[0].id,
        )
        db.add(group_conv)
        db.flush()
        
        for user in users[:4]:  # Alice, Bob, Charlie, Diana
            member = ConversationMember(
                conversation_id=group_conv.id,
                user_id=user.id,
                role="admin" if user == users[0] else "member"
            )
            db.add(member)
        
        conversations.append(group_conv)
        db.commit()
        print(f"Created {len(conversations)} conversations")
        
        # Create sample messages
        sample_messages = [
            # Alice - Bob conversation
            (conversations[0], users[0], "Hey Bob! How's it going?", "sent"),
            (conversations[0], users[1], "Hi Alice! I'm doing great, thanks for asking.", "read"),
            (conversations[0], users[0], "Want to grab coffee this weekend?", "read"),
            (conversations[0], users[1], "Sure! Saturday morning works for me.", "read"),
            (conversations[0], users[0], "Perfect, see you at 10?", "delivered"),
            
            # Alice - Charlie conversation
            (conversations[1], users[2], "Alice, did you finish the report?", "read"),
            (conversations[1], users[0], "Yes, just sent it to your email!", "read"),
            (conversations[1], users[2], "Got it, looks great. Thanks!", "read"),
            
            # Alice - Diana conversation
            (conversations[2], users[3], "Are we still on for the movie tonight?", "sent"),
            (conversations[2], users[0], "Absolutely! 7pm at the usual place?", "delivered"),
            
            # Group - Weekend Plans
            (group_conv, users[0], "Hey everyone! What are we doing this weekend?", "read"),
            (group_conv, users[1], "How about hiking?", "read"),
            (group_conv, users[2], "Sounds good to me! Where should we go?", "read"),
            (group_conv, users[3], "I know a great trail about 2 hours away", "delivered"),
            (group_conv, users[0], "Let's do it! I'll bring snacks 🎒", "sent"),
        ]
        
        for conv, sender, content, status in sample_messages:
            msg = Message(
                conversation_id=conv.id,
                sender_id=sender.id,
                content=content,
                status=status,
                is_encrypted=True
            )
            db.add(msg)
        
        db.commit()
        print(f"Created {len(sample_messages)} messages")
        
        # Update conversation timestamps to reflect last message
        for conv in conversations:
            last_msg = db.query(Message).filter(
                Message.conversation_id == conv.id
            ).order_by(Message.created_at.desc()).first()
            
            if last_msg:
                conv.updated_at = last_msg.created_at
        
        db.commit()
        print("Database seeding complete!")
        
    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    # Create tables first
    Base.metadata.create_all(bind=engine)
    create_seed_data()