/**
 * Zustand store for authentication state management.
 */

import { create } from 'zustand';

interface User {
  id: number;
  username: string;
  phone_number: string;
  display_name: string;
  avatar_url: string | null;
  status_message: string | null;
  is_online: boolean;
  last_seen_at: string | null;
  created_at: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  login: (user: User, token: string) => void;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,

  setUser: (user) => set({ user, isAuthenticated: !!user }),

  setToken: (token) => set({ token }),

  login: (user, token) => {
    // Always clear first to prevent stale data
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    
    set({ user, token, isAuthenticated: true });
    console.log('[AuthStore] Logged in as:', user.username, 'ID:', user.id);
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    set({ user: null, token: null, isAuthenticated: false });
    console.log('[AuthStore] Logged out');
  },

  updateUser: (updates) =>
    set((state) => {
      if (!state.user) return state;
      const updated = { ...state.user, ...updates };
      localStorage.setItem('user', JSON.stringify(updated));
      console.log('[AuthStore] Updated user:', updated.display_name);
      return { user: updated };
    }),
}));

/**
 * Initialize auth state from localStorage on app load.
 */
export function initializeAuth(): void {
  if (typeof window === 'undefined') return;

  const token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');

  if (token && userStr) {
    try {
      const user = JSON.parse(userStr);
      useAuthStore.setState({ user, token, isAuthenticated: true });
      console.log('[AuthStore] Initialized from localStorage:', user.username);
    } catch {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
  }
}