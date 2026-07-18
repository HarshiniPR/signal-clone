"""
Main FastAPI application entry point.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.config import settings
from app.database import engine, Base
from app.websocket import socket_app, sio
from app.routers import auth, users, conversations, messages
from app.seed import create_seed_data


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler."""
    print("Creating database tables...")
    Base.metadata.create_all(bind=engine)
    
    print("Seeding database...")
    create_seed_data()
    
    yield
    
    print("Shutting down...")


# Initialize FastAPI app
app = FastAPI(
    title="Signal Clone API",
    description="Production-quality Signal Messenger clone backend with real-time messaging",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all for dev
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"]
)

# Include REST API routers
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(conversations.router)
app.include_router(messages.router)


@app.get("/")
async def root():
    """Root endpoint - API health check."""
    return {
        "message": "Signal Clone API",
        "version": "1.0.0",
        "status": "running"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint for monitoring."""
    return {
        "status": "healthy",
        "database": "connected",
        "websocket": "enabled"
    }


# IMPORTANT: Mount Socket.IO at root - it handles its own routing
app.mount("/", socket_app)