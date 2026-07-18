/**
 * Zustand store for chat state management.
 * Handles active conversation, messages, typing indicators, and unread counts.
 */

import { create } from 'zustand';

interface TypingUser {
  user_id: number;
  is_typing: boolean;
}

interface ChatState {
  // Active conversation
  activeConversationId: number | null;
  setActiveConversation: (id: number | null) => void;

  // Typing indicators per conversation
  typingUsers: Record<number, TypingUser[]>;
  setTypingUser: (conversationId: number, userId: number, isTyping: boolean) => void;
  clearTypingUser: (conversationId: number, userId: number) => void;

  // Unread counts per conversation
  unreadCounts: Record<number, number>;
  setUnreadCount: (conversationId: number, count: number) => void;
  incrementUnread: (conversationId: number) => void;
  clearUnread: (conversationId: number) => void;

  // Online status of users
  onlineUsers: Record<number, boolean>;
  setUserOnline: (userId: number, isOnline: boolean) => void;

  // Message sending state
  sendingMessages: Set<number>;
  addSendingMessage: (tempId: number) => void;
  removeSendingMessage: (tempId: number) => void;
}

export const useChatStore = create<ChatState>()((set) => ({
  activeConversationId: null,
  setActiveConversation: (id) => set({ activeConversationId: id }),

  typingUsers: {},
  setTypingUser: (conversationId, userId, isTyping) =>
    set((state) => {
      const current = state.typingUsers[conversationId] || [];
      const filtered = current.filter((u) => u.user_id !== userId);
      if (isTyping) {
        filtered.push({ user_id: userId, is_typing: true });
      }
      return {
        typingUsers: {
          ...state.typingUsers,
          [conversationId]: filtered,
        },
      };
    }),
  clearTypingUser: (conversationId, userId) =>
    set((state) => ({
      typingUsers: {
        ...state.typingUsers,
        [conversationId]: (state.typingUsers[conversationId] || []).filter(
          (u) => u.user_id !== userId
        ),
      },
    })),

  unreadCounts: {},
  setUnreadCount: (conversationId, count) =>
    set((state) => ({
      unreadCounts: { ...state.unreadCounts, [conversationId]: count },
    })),
  incrementUnread: (conversationId) =>
    set((state) => ({
      unreadCounts: {
        ...state.unreadCounts,
        [conversationId]: (state.unreadCounts[conversationId] || 0) + 1,
      },
    })),
  clearUnread: (conversationId) =>
    set((state) => ({
      unreadCounts: { ...state.unreadCounts, [conversationId]: 0 },
    })),

  onlineUsers: {},
  setUserOnline: (userId, isOnline) =>
    set((state) => ({
      onlineUsers: { ...state.onlineUsers, [userId]: isOnline },
    })),

  sendingMessages: new Set(),
  addSendingMessage: (tempId) =>
    set((state) => ({
      sendingMessages: new Set([...state.sendingMessages, tempId]),
    })),
  removeSendingMessage: (tempId) =>
    set((state) => {
      const newSet = new Set(state.sendingMessages);
      newSet.delete(tempId);
      return { sendingMessages: newSet };
    }),
}));