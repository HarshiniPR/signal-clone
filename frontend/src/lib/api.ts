/**
 * Axios instance configuration for API requests.
 * Handles base URL, authentication headers, and token refresh.
 */

import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

/**
 * Create configured axios instance.
 */
export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Request interceptor to add auth token to all requests.
 */
api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * Response interceptor to handle 401 errors and token expiration.
 */
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid - clear auth and redirect
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// ==================== AUTH API ====================

export const authApi = {
  register: (data: { username: string; phone_number: string; password: string; display_name: string }) =>
    api.post('/auth/register', data),

  login: (data: { username: string; password: string }) =>
    api.post('/auth/login', data),

  logout: () => api.post('/auth/logout'),

  sendOTP: (phone_number: string) =>
    api.post('/auth/otp/send', { phone_number }),

  verifyOTP: (phone_number: string, otp: string) =>
    api.post('/auth/otp/verify', { phone_number, otp }),

  me: () => api.get('/auth/me'),
};

// ==================== USER API ====================

export const userApi = {
  search: (query: string) => api.get(`/users/search?q=${encodeURIComponent(query)}`),

  getContacts: () => api.get('/users/contacts'),

  addContact: (contact_username: string) =>
    api.post('/users/contacts', { contact_username }),

  removeContact: (contact_id: number) =>
    api.delete(`/users/contacts/${contact_id}`),

  getProfile: () => api.get('/users/profile'),

  updateProfile: (data: { display_name?: string; status_message?: string; avatar_url?: string }) =>
    api.put('/users/profile', data),

  getSettings: () => api.get('/users/settings'),

  updateSettings: (data: Record<string, unknown>) =>
    api.put('/users/settings', data),
};

// ==================== CONVERSATION API ====================

export const conversationApi = {
  list: () => api.get('/conversations'),

  get: (id: number) => api.get(`/conversations/${id}`),

  createDirect: (user_id: number) =>
    api.post('/conversations/direct', { user_id }),

  createGroup: (name: string, member_ids: number[]) =>
    api.post('/conversations/groups', { name, member_ids }),

  updateGroup: (id: number, data: { name?: string; avatar_url?: string }) =>
    api.put(`/conversations/groups/${id}`, data),

  addMember: (conversation_id: number, user_id: number) =>
    api.post(`/conversations/groups/${conversation_id}/members/${user_id}`),

  removeMember: (conversation_id: number, user_id: number) =>
    api.delete(`/conversations/groups/${conversation_id}/members/${user_id}`),
};

// ==================== MESSAGE API ====================

export const messageApi = {
  getMessages: (conversation_id: number, limit = 50, offset = 0) =>
    api.get(`/messages/conversation/${conversation_id}?limit=${limit}&offset=${offset}`),

  sendMessage: (data: { content: string; conversation_id: number; reply_to_id?: number }) =>
    api.post('/messages', data),

  updateStatus: (message_id: number, status: string) =>
    api.put(`/messages/${message_id}/status`, { status }),

  getUnreadCount: (conversation_id: number) =>
    api.get(`/messages/conversation/${conversation_id}/unread-count`),
};