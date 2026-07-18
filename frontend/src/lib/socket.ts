/**
 * Socket.IO client configuration for real-time messaging.
 */

import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:8000';

let socket: Socket | null = null;
let isConnecting = false;

/**
 * Initialize and return Socket.IO connection.
 */
export function getSocket(): Socket | null {
  if (typeof window === 'undefined') return null;

  // Return existing connected socket
  if (socket?.connected) {
    return socket;
  }

  // Prevent multiple simultaneous connection attempts
  if (isConnecting) {
    return socket;
  }

  isConnecting = true;
  const token = localStorage.getItem('token');

  console.log('[Socket] Connecting with token:', token ? 'present' : 'missing');

  socket = io(SOCKET_URL, {
    path: '/socket.io',
    transports: ['websocket', 'polling'],
    auth: token ? { token } : undefined,
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 20000,
  });

  socket.on('connect', () => {
    console.log('[Socket] Connected:', socket?.id);
    isConnecting = false;
  });

  socket.on('disconnect', (reason) => {
    console.log('[Socket] Disconnected:', reason);
    isConnecting = false;
  });

  socket.on('connect_error', (error) => {
    console.error('[Socket] Connection error:', error.message);
    isConnecting = false;
  });

  socket.on('auth_error', (data) => {
    console.error('[Socket] Auth error:', data.message);
    // Don't redirect immediately - let the user see the error
    if (data.message === 'Invalid token') {
      console.log('[Socket] Token invalid, will retry on reconnect');
    }
  });

  socket.on('error', (data) => {
    console.error('[Socket] Server error:', data.message);
  });

  return socket;
}

/**
 * Disconnect and cleanup socket.
 */
export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket.removeAllListeners();
    socket = null;
  }
  isConnecting = false;
}

/**
 * Check if socket is connected.
 */
export function isSocketConnected(): boolean {
  return socket?.connected ?? false;
}

/**
 * Join a conversation room.
 */
export function joinConversation(conversation_id: number): void {
  const s = getSocket();
  if (s?.connected) {
    s.emit('join_conversation', { conversation_id });
  }
}

/**
 * Leave a conversation room.
 */
export function leaveConversation(conversation_id: number): void {
  const s = getSocket();
  if (s?.connected) {
    s.emit('leave_conversation', { conversation_id });
  }
}

/**
 * Send a message via WebSocket.
 */
export function sendSocketMessage(data: {
  conversation_id: number;
  content: string;
  reply_to_id?: number;
}): void {
  const s = getSocket();
  if (s?.connected) {
    s.emit('send_message', data);
  } else {
    console.error('[Socket] Cannot send message - not connected');
  }
}

/**
 * Send typing indicator.
 */
export function sendTyping(conversation_id: number, is_typing: boolean): void {
  const s = getSocket();
  if (s?.connected) {
    s.emit('typing', { conversation_id, is_typing });
  }
}

/**
 * Send read receipt.
 */
export function sendReadReceipt(message_id: number, conversation_id: number): void {
  const s = getSocket();
  if (s?.connected) {
    s.emit('read_receipt', { message_id, conversation_id });
  }
}

/**
 * Send message delivered status.
 */
export function sendDeliveredStatus(message_id: number): void {
  const s = getSocket();
  if (s?.connected) {
    s.emit('message_status', { message_id, status: 'delivered' });
  }
}