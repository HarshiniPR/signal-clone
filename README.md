# Signal Clone

A production-quality Signal Messenger clone with real-time messaging, group chats, and a Signal-inspired UI.

## Live Demo

- **Frontend:** [https://signal-clone-ca1qk3zh4-fun12434.vercel.app/login](https://signal-clone-ca1qk3zh4-fun12434.vercel.app/login)
- **Backend API:** [https://signal-clone-b8p9.onrender.com/](https://signal-clone-b8p9.onrender.com/)

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15, React 19, TypeScript, TailwindCSS, Zustand, React Query, Socket.IO Client |
| Backend | FastAPI, SQLAlchemy, SQLite, Socket.IO, Pydantic, python-jose, bcrypt |
| Deployment | Vercel (frontend), Render (backend) |

## Features

- JWT authentication with mocked OTP (123456)
- Real-time messaging via WebSockets
- Group creation and member management
- Read receipts, typing indicators, online status
- Contact search and management
- Profile editing
- Settings placeholders (privacy, notifications, appearance)
- Responsive design (desktop, tablet, mobile)

## Demo Credentials

| Username | Password | Display Name |
|----------|----------|--------------|
| alice | password123 | Alice Johnson |
| bob | password123 | Bob Smith |
| charlie | password123 | Charlie Brown |
| diana | password123 | Diana Prince |
| eve | password123 | Eve Online |


## Database Schema

- **Users** — authentication, profile, online status
- **Contacts** — bidirectional contact relationships
- **Conversations** — direct and group chats
- **ConversationMembers** — membership with roles (admin/member)
- **Messages** — content, status, read receipts
- **Sessions** — JWT token tracking for logout

## Running Locally

### Backend 
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Assumptions & Mocked Data
* OTP is fixed to 123456
* End-to-end encryption is simulated (boolean flag only)
* Phone verification is mocked; no actual SMS sent
* Voice calls, video calls, stories, file attachments are placeholder features
* SQLite is used for simplicity; PostgreSQL recommended for production

## Deployment
* Frontend: Deployed on Vercel with next build
* Backend: Deployed on Render with uvicorn (start command: uvicorn app.main:app --host 0.0.0.0 --port $PORT)

## Environment Variables
Frontend (Vercel)
| Variable                 | Description          |
| ------------------------ | -------------------- |
| `NEXT_PUBLIC_API_URL`    | Backend API URL      |
| `NEXT_PUBLIC_SOCKET_URL` | WebSocket server URL |

## Backend (Render)
| Variable       | Description                           |
| -------------- | ------------------------------------- |
| `SECRET_KEY`   | JWT signing key                       |
| `DATABASE_URL` | SQLite path or PostgreSQL URI         |
| `CORS_ORIGINS` | Comma-separated allowed frontend URLs |

