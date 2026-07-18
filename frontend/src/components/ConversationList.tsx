/**
 * Conversation list sidebar component.
 */

'use client';

import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  Search, 
  Plus, 
  MessageCircle, 
  Users, 
  Menu
} from 'lucide-react';
import { conversationApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { useChatStore } from '@/store/chatStore';
import { cn, formatMessageTime, truncate, getInitials, stringToColor } from '@/lib/utils';
import CreateGroupModal from './CreateGroupModal';
import SearchModal from './SearchModal';

interface ConversationListProps {
  onMenuClick: () => void;
}

interface Conversation {
  id: number;
  name: string | null;
  is_group: boolean;
  avatar_url: string | null;
  unread_count: number;
  updated_at: string;
  last_message: {
    content: string;
    sender_id: number;
    created_at: string;
    status: string;
  } | null;
  members: Array<{
    user_id: number;
    user: {
      id: number;
      username: string;
      display_name: string;
      avatar_url: string | null;
      is_online: boolean;
    };
  }>;
}

export default function ConversationList({ onMenuClick }: ConversationListProps) {
  const { user } = useAuthStore();
  const { activeConversationId, setActiveConversation, onlineUsers } = useChatStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const queryClient = useQueryClient();

  // Force refetch when user changes
  useEffect(() => {
    if (user?.id) {
      console.log('[ConversationList] User changed to:', user.username, 'ID:', user.id);
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    }
  }, [user?.id, queryClient]);

  const { data: conversations, isLoading } = useQuery({
    queryKey: ['conversations', user?.id], // Include user ID in key
    queryFn: async () => {
      console.log('[ConversationList] Fetching conversations for user:', user?.username);
      const response = await conversationApi.list();
      return response.data as Conversation[];
    },
    enabled: !!user?.id,
  });

  const filteredConversations = conversations?.filter((conv) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    const name = conv.name || conv.members.find(m => m.user_id !== user?.id)?.user.display_name || '';
    return name.toLowerCase().includes(query);
  });

  const getConversationName = (conv: Conversation): string => {
    if (conv.name) return conv.name;
    const otherMember = conv.members.find(m => m.user_id !== user?.id);
    return otherMember?.user.display_name || otherMember?.user.username || 'Unknown';
  };

  const getConversationAvatar = (conv: Conversation) => {
    if (conv.avatar_url) {
      return (
        <img 
          src={conv.avatar_url} 
          alt={getConversationName(conv)}
          className="w-full h-full rounded-full object-cover"
        />
      );
    }

    if (conv.is_group) {
      return (
        <div className="w-full h-full bg-gray-200 rounded-full flex items-center justify-center">
          <Users size={18} className="text-gray-500" />
        </div>
      );
    }

    const otherMember = conv.members.find(m => m.user_id !== user?.id);
    const name = otherMember?.user.display_name || otherMember?.user.username || 'Unknown';
    const color = stringToColor(otherMember?.user.username || 'unknown');

    return (
      <div className={cn("w-full h-full rounded-full flex items-center justify-center text-white font-semibold", color)}>
        {getInitials(name)}
      </div>
    );
  };

  const isOnline = (conv: Conversation): boolean => {
    if (conv.is_group) return false;
    const otherMember = conv.members.find(m => m.user_id !== user?.id);
    if (!otherMember) return false;
    return onlineUsers[otherMember.user.id] ?? otherMember.user.is_online;
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={onMenuClick}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <Menu size={20} className="text-gray-600" />
          </button>
          <h1 className="text-lg font-semibold text-gray-900">Chats</h1>
          <button
            onClick={() => setShowCreateGroup(true)}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <Plus size={20} className="text-gray-600" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative mb-2">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setShowSearch(true)}
            placeholder="Search conversations..."
            className="w-full bg-gray-100 border-0 rounded-xl pl-9 pr-4 py-2 text-sm focus:ring-2 focus:ring-signal-blue/20 focus:bg-white transition-all"
          />
        </div>
      </div>

      {/* Conversations */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-signal-blue border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredConversations?.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <MessageCircle size={48} className="mb-3 opacity-50" />
            <p className="text-sm">No conversations yet</p>
            <button
              onClick={() => setShowSearch(true)}
              className="mt-2 text-signal-blue text-sm font-medium hover:underline"
            >
              Start a new chat
            </button>
          </div>
        ) : (
          filteredConversations?.map((conv) => (
            <button
              key={conv.id}
              onClick={() => setActiveConversation(conv.id)}
              className={cn(
                "conversation-item w-full text-left",
                activeConversationId === conv.id && "active"
              )}
            >
              {/* Avatar */}
              <div className="relative flex-shrink-0">
                <div className="w-12 h-12 rounded-full overflow-hidden">
                  {getConversationAvatar(conv)}
                </div>
                {isOnline(conv) && !conv.is_group && (
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 ml-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900 truncate">
                    {getConversationName(conv)}
                  </h3>
                  {conv.last_message && (
                    <span className="text-xs text-gray-400 flex-shrink-0 ml-2">
                      {formatMessageTime(conv.last_message.created_at)}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between mt-0.5">
                  <p className={cn(
                    "text-sm truncate",
                    conv.unread_count > 0 ? "text-gray-900 font-medium" : "text-gray-500"
                  )}>
                    {conv.last_message ? (
                      <>
                        {conv.last_message.sender_id === user?.id && (
                          <span className="text-gray-400">You: </span>
                        )}
                        {truncate(conv.last_message.content, 40)}
                      </>
                    ) : (
                      <span className="text-gray-400 italic">No messages yet</span>
                    )}
                  </p>
                  {conv.unread_count > 0 && (
                    <span className="flex-shrink-0 ml-2 min-w-[20px] h-5 bg-signal-blue text-white text-xs font-bold rounded-full flex items-center justify-center px-1.5">
                      {conv.unread_count > 99 ? '99+' : conv.unread_count}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))
        )}
      </div>

      {/* Modals */}
      {showCreateGroup && (
        <CreateGroupModal onClose={() => setShowCreateGroup(false)} />
      )}
      {showSearch && (
        <SearchModal 
          onClose={() => {
            setShowSearch(false);
            setSearchQuery('');
          }}
          onSelectConversation={(id) => {
            setActiveConversation(id);
            setShowSearch(false);
            setSearchQuery('');
          }}
        />
      )}
    </div>
  );
}