"""
WebSocket manager for real-time messaging, typing indicators, and presence.
Uses Socket.IO for reliable bidirectional communication.
"""

import socketio
from typing import Dict, Set, Optional
from sqlalchemy.orm import Session
from datetime import datetime, timezone

from app.database import SessionLocal
from app.models import User, Message, Conversation, ConversationMember
from app.auth import get_current_user_ws


# Create Socket.IO server
sio = socketio.AsyncServer(
    async_mode='asgi',
    cors_allowed_origins='*',
    ping_interval=25,
    ping_timeout=60,
    logger=False,
    engineio_logger=False
)

# Track connected users: {user_id: set of socket IDs}
connected_users: Dict[int, Set[str]] = {}

# Track typing users: {(conversation_id, user_id): socket_id}
typing_users: Dict[tuple, str] = {}

# Track user rooms: {socket_id: set of conversation_ids}
user_rooms: Dict[str, Set[int]] = {}


async def get_user_from_token(token: str) -> Optional[User]:
    """Helper to authenticate user from WebSocket token."""
    db = SessionLocal()
    try:
        user = await get_current_user_ws(token, db)
        return user
    except Exception:
        return None
    finally:
        db.close()


@sio.event
async def connect(sid, environ, auth):
    """
    Handle new WebSocket connection.
    """
    # Try to get token from multiple sources
    token = None
    
    if auth and isinstance(auth, dict):
        token = auth.get('token')
    
    # Check query string
    if not token and environ.get('QUERY_STRING'):
        query = environ['QUERY_STRING']
        for param in query.split('&'):
            if param.startswith('token='):
                token = param.split('=', 1)[1]
                break
    
    # Check headers
    if not token and environ.get('HTTP_AUTHORIZATION'):
        auth_header = environ['HTTP_AUTHORIZATION']
        if auth_header.startswith('Bearer '):
            token = auth_header[7:]
    
    if not token:
        print(f"[Socket] No token provided for sid={sid}")
        return False
    
    user = await get_user_from_token(token)
    if not user:
        print(f"[Socket] Invalid token for sid={sid}")
        return False
    
    print(f"[Socket] User {user.username} connected with sid={sid}")
    
    # Store user data in session
    await sio.save_session(sid, {
        'user_id': user.id,
        'username': user.username,
        'display_name': user.display_name
    })
    
    # Track connection
    if user.id not in connected_users:
        connected_users[user.id] = set()
    connected_users[user.id].add(sid)
    user_rooms[sid] = set()
    
    # Update online status
    db = SessionLocal()
    try:
        user.is_online = True
        user.last_seen_at = None
        db.commit()
        
        # Join all conversation rooms
        memberships = db.query(ConversationMember).filter(
            ConversationMember.user_id == user.id
        ).all()
        
        for membership in memberships:
            room = f"conversation_{membership.conversation_id}"
            await sio.enter_room(sid, room)
            user_rooms[sid].add(membership.conversation_id)
            print(f"[Socket] User {user.username} joined room {room}")
    finally:
        db.close()
    
    await sio.emit('connected', {
        'user_id': user.id,
        'message': 'Connected successfully'
    }, to=sid)
    
    return True


@sio.event
async def disconnect(sid):
    """Handle WebSocket disconnection."""
    try:
        session = await sio.get_session(sid)
    except Exception:
        return
    
    if not session:
        return
    
    user_id = session.get('user_id')
    if not user_id:
        return
    
    print(f"[Socket] User disconnecting sid={sid}, user_id={user_id}")
    
    # Remove from tracking
    if user_id in connected_users:
        connected_users[user_id].discard(sid)
        if not connected_users[user_id]:
            del connected_users[user_id]
            
            # Update offline status
            db = SessionLocal()
            try:
                user = db.query(User).filter(User.id == user_id).first()
                if user:
                    user.is_online = False
                    user.last_seen_at = datetime.now(timezone.utc)
                    db.commit()
                    print(f"[Socket] User {user.username} marked offline")
            finally:
                db.close()
    
    # Clean up typing indicator
    keys_to_remove = [k for k, v in typing_users.items() if v == sid]
    for key in keys_to_remove:
        del typing_users[key]
    
    # Clean up rooms
    if sid in user_rooms:
        del user_rooms[sid]


@sio.event
async def send_message(sid, data):
    """Handle incoming message from client."""
    session = await sio.get_session(sid)
    if not session:
        print(f"[Socket] No session for sid={sid}")
        return
    
    user_id = session['user_id']
    conversation_id = data.get('conversation_id')
    content = data.get('content')
    reply_to_id = data.get('reply_to_id')
    
    print(f"[Socket] send_message from user={user_id}, conv={conversation_id}")
    
    if not conversation_id or not content:
        await sio.emit('error', {'message': 'Missing conversation_id or content'}, to=sid)
        return
    
    db = SessionLocal()
    try:
        # Verify membership
        membership = db.query(ConversationMember).filter(
            ConversationMember.conversation_id == conversation_id,
            ConversationMember.user_id == user_id
        ).first()
        
        if not membership:
            await sio.emit('error', {'message': 'Not a member of this conversation'}, to=sid)
            return
        
        # Create and save message
        message = Message(
            conversation_id=conversation_id,
            sender_id=user_id,
            content=content,
            message_type="text",
            status="sent",
            reply_to_id=reply_to_id,
            is_encrypted=True
        )
        db.add(message)
        db.commit()
        db.refresh(message)
        
        # Update conversation updated_at
        conversation = db.query(Conversation).filter(Conversation.id == conversation_id).first()
        if conversation:
            from sqlalchemy.sql import func
            conversation.updated_at = func.now()
            db.commit()
        
        # Get sender info
        sender = db.query(User).filter(User.id == user_id).first()
        
        # Build message payload
        message_data = {
            'id': message.id,
            'conversation_id': conversation_id,
            'sender_id': user_id,
            'sender': {
                'id': sender.id,
                'username': sender.username,
                'display_name': sender.display_name,
                'avatar_url': sender.avatar_url,
                'is_online': sender.is_online
            },
            'content': content,
            'message_type': message.message_type,
            'status': message.status,
            'reply_to_id': reply_to_id,
            'is_encrypted': message.is_encrypted,
            'created_at': message.created_at.isoformat() if message.created_at else datetime.now(timezone.utc).isoformat(),
            'updated_at': message.updated_at.isoformat() if message.updated_at else datetime.now(timezone.utc).isoformat()
        }
        
        print(f"[Socket] Broadcasting message {message.id} to room conversation_{conversation_id}")
        
        # Broadcast to conversation room (include sender so all clients get it)
        room = f"conversation_{conversation_id}"
        await sio.emit('new_message', message_data, room=room)
        
        # Confirm to sender
        await sio.emit('message_sent', {
            'message_id': message.id,
            'conversation_id': conversation_id,
            'status': 'sent'
        }, to=sid)
        
    except Exception as e:
        print(f"[Socket] Error sending message: {e}")
        await sio.emit('error', {'message': f'Failed to send message: {str(e)}'}, to=sid)
    finally:
        db.close()


@sio.event
async def typing(sid, data):
    """Handle typing indicator events."""
    session = await sio.get_session(sid)
    if not session:
        return
    
    user_id = session['user_id']
    conversation_id = data.get('conversation_id')
    is_typing = data.get('is_typing', False)
    
    if not conversation_id:
        return
    
    key = (conversation_id, user_id)
    
    if is_typing:
        typing_users[key] = sid
    else:
        typing_users.pop(key, None)
    
    room = f"conversation_{conversation_id}"
    await sio.emit('typing', {
        'conversation_id': conversation_id,
        'user_id': user_id,
        'is_typing': is_typing
    }, room=room, skip_sid=sid)


@sio.event
async def read_receipt(sid, data):
    """Handle read receipt from client."""
    session = await sio.get_session(sid)
    if not session:
        return
    
    user_id = session['user_id']
    message_id = data.get('message_id')
    conversation_id = data.get('conversation_id')
    
    if not message_id or not conversation_id:
        return
    
    db = SessionLocal()
    try:
        membership = db.query(ConversationMember).filter(
            ConversationMember.conversation_id == conversation_id,
            ConversationMember.user_id == user_id
        ).first()
        
        if not membership:
            return
        
        message = db.query(Message).filter(
            Message.id == message_id,
            Message.conversation_id == conversation_id
        ).first()
        
        if message and message.sender_id != user_id:
            if message.status in ['sent', 'delivered']:
                message.status = 'read'
                db.commit()
                
                # Notify sender if online
                if message.sender_id in connected_users:
                    for sender_sid in connected_users[message.sender_id]:
                        await sio.emit('message_read', {
                            'message_id': message_id,
                            'conversation_id': conversation_id,
                            'read_by': user_id
                        }, to=sender_sid)
        
    finally:
        db.close()


@sio.event
async def message_status(sid, data):
    """Handle message status update (delivered)."""
    session = await sio.get_session(sid)
    if not session:
        return
    
    user_id = session['user_id']
    message_id = data.get('message_id')
    status = data.get('status')
    
    if not message_id or not status:
        return
    
    db = SessionLocal()
    try:
        message = db.query(Message).filter(Message.id == message_id).first()
        
        if message and message.sender_id != user_id:
            if message.status == 'sent' and status == 'delivered':
                message.status = 'delivered'
                db.commit()
                
                if message.sender_id in connected_users:
                    for sender_sid in connected_users[message.sender_id]:
                        await sio.emit('message_delivered', {
                            'message_id': message_id,
                            'status': 'delivered'
                        }, to=sender_sid)
    finally:
        db.close()


@sio.event
async def join_conversation(sid, data):
    """Explicitly join a conversation room."""
    session = await sio.get_session(sid)
    if not session:
        return
    
    conversation_id = data.get('conversation_id')
    if not conversation_id:
        return
    
    room = f"conversation_{conversation_id}"
    await sio.enter_room(sid, room)
    
    if sid not in user_rooms:
        user_rooms[sid] = set()
    user_rooms[sid].add(conversation_id)
    
    await sio.emit('joined_conversation', {
        'conversation_id': conversation_id
    }, to=sid)


@sio.event
async def leave_conversation(sid, data):
    """Leave a conversation room."""
    conversation_id = data.get('conversation_id')
    if not conversation_id:
        return
    
    room = f"conversation_{conversation_id}"
    await sio.leave_room(sid, room)
    
    if sid in user_rooms:
        user_rooms[sid].discard(conversation_id)


# Socket.IO ASGI application
socket_app = socketio.ASGIApp(sio, socketio_path='socket.io')