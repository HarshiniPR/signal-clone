
## Database Schema
Users
├── id (PK)
├── username (unique)
├── phone_number (unique)
├── display_name
├── password_hash
├── avatar_url
├── status_message
├── is_online
├── last_seen_at
├── created_at
└── updated_at
Contacts (self-referential many-to-many)
├── id (PK)
├── user_id (FK -> Users)
├── contact_id (FK -> Users)
└── created_at
Conversations
├── id (PK)
├── name (nullable for direct)
├── is_group
├── avatar_url
├── created_by (FK -> Users)
├── created_at
└── updated_at
ConversationMembers
├── id (PK)
├── conversation_id (FK)
├── user_id (FK)
├── role ('admin' | 'member')
├── joined_at
└── last_read_message_id (FK)
Messages
├── id (PK)
├── conversation_id (FK)
├── sender_id (FK)
├── content
├── message_type ('text' | 'image' | 'file')
├── status ('sending' | 'sent' | 'delivered' | 'read')
├── reply_to_id (FK, nullable)
├── is_encrypted
├── created_at
└── updated_at
Sessions
├── id (PK)
├── user_id (FK)
├── token_jti (unique, for revocation)
├── device_info
├── ip_address
├── is_active
├── created_at
├── expires_at
└── last_active_at


## Installation

### Prerequisites
- Python 3.11+
- Node.js 20+
- npm or yarn

### Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate (Linux/Mac)
source venv/bin/activate

# Activate (Windows)
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create environment file
cp .env.example .env

# Run the server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

The backend will auto-create the SQLite database and seed it with sample data on first run.
Frontend Setup
bash
cd frontend

# Install dependencies
npm install

# Create environment file
cp .env.local.example .env.local

# Run development server
npm run dev
The frontend will be available at http://localhost:3000.
Running the Application
Development
Start the backend (port 8000):
bash
cd backend && uvicorn app.main:app --reload
Start the frontend (port 3000):
bash
cd frontend && npm run dev
Open http://localhost:3000 in your browser
Demo Credentials
The database is pre-seeded with sample users:
Table
Username	Password	Display Name
alice	password123	Alice Johnson
bob	password123	Bob Smith
charlie	password123	Charlie Brown
diana	password123	Diana Prince
eve	password123	Eve Online
API Overview
Authentication
POST /auth/register - Register new user
POST /auth/login - Login with username/password
POST /auth/logout - Revoke session
POST /auth/otp/send - Send mock OTP
POST /auth/otp/verify - Verify mock OTP
GET /auth/me - Get current user
Users
GET /users/search?q={query} - Search users
GET /users/contacts - List contacts
POST /users/contacts - Add contact
DELETE /users/contacts/{id} - Remove contact
GET /users/profile - Get profile
PUT /users/profile - Update profile
GET /users/settings - Get settings
PUT /users/settings - Update settings
Conversations
GET /conversations - List user's conversations
GET /conversations/{id} - Get conversation details
POST /conversations/direct - Create direct conversation
POST /conversations/groups - Create group
PUT /conversations/groups/{id} - Update group
POST /conversations/groups/{id}/members/{user_id} - Add member
DELETE /conversations/groups/{id}/members/{user_id} - Remove member
Messages
GET /messages/conversation/{id} - Get messages
POST /messages - Send message
PUT /messages/{id}/status - Update message status
GET /messages/conversation/{id}/unread-count - Get unread count
WebSocket Events
Client -> Server:
send_message - Send real-time message
typing - Send typing indicator
read_receipt - Mark message as read
message_status - Update delivery status
join_conversation - Join room
leave_conversation - Leave room

Server -> Client:
new_message - New message received
typing - Typing indicator update
message_sent - Confirm message sent
message_read - Message read by recipient
message_delivered - Message delivered
unread_update - Unread count update
user_online - User came online
user_offline - User went offline
connected - Connection established
auth_error - Authentication failed