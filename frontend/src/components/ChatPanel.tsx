/**
 * Main chat panel component - displays messages, input, and handles real-time communication.
 * Shows empty state when no conversation is selected.
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  Phone, 
  Video, 
  MoreVertical, 
  ArrowLeft, 
  Send, 
  Paperclip,
  Smile,
  Check,
  CheckCheck,
  Clock,
  Lock
} from 'lucide-react';
import { conversationApi, messageApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { useChatStore } from '@/store/chatStore';
import { 
  getSocket, 
  sendSocketMessage, 
  sendTyping, 
  sendReadReceipt,
  sendDeliveredStatus,
  joinConversation,
  leaveConversation
} from '@/lib/socket';
import { cn, formatMessageTime, formatDateHeader, getInitials, stringToColor } from '@/lib/utils';
import toast from 'react-hot-toast';

// Extended member type with last_seen_at
interface MemberUser {
  id: number;
  username: string;
  display_name: string;
  avatar_url: string | null;
  is_online: boolean;
  last_seen_at: string | null;
}

interface Message {
  id: number;
  conversation_id: number;
  sender_id: number;
  sender: {
    id: number;
    username: string;
    display_name: string;
    avatar_url: string | null;
    is_online: boolean;
  };
  content: string;
  message_type: string;
  status: string;
  reply_to_id: number | null;
  reply_to: Message | null;
  is_encrypted: boolean;
  created_at: string;
  updated_at: string;
}

interface Conversation {
  id: number;
  name: string | null;
  is_group: boolean;
  avatar_url: string | null;
  members: Array<{
    user_id: number;
    user: MemberUser;
  }>;
}

export default function ChatPanel() {
  const { user } = useAuthStore();
  const { 
    activeConversationId, 
    setActiveConversation,
    typingUsers,
    setTypingUser,
    onlineUsers,
    setUserOnline
  } = useChatStore();
  
  const [messageInput, setMessageInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const queryClient = useQueryClient();

  // Fetch conversation details
  const { data: conversation } = useQuery({
    queryKey: ['conversation', activeConversationId],
    queryFn: async () => {
      if (!activeConversationId) return null;
      const response = await conversationApi.get(activeConversationId);
      return response.data as Conversation;
    },
    enabled: !!activeConversationId,
  });

  // Fetch messages
  const { data: messages, isLoading: messagesLoading } = useQuery({
    queryKey: ['messages', activeConversationId],
    queryFn: async () => {
      if (!activeConversationId) return [];
      const response = await messageApi.getMessages(activeConversationId, 100);
      return response.data as Message[];
    },
    enabled: !!activeConversationId,
  });

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Join conversation room and setup socket listeners
  useEffect(() => {
    if (!activeConversationId) return;

    const socket = getSocket();
    if (!socket) return;

    joinConversation(activeConversationId);

    // Mark messages as read
    const lastMessage = messages?.[messages.length - 1];
    if (lastMessage && lastMessage.sender_id !== user?.id) {
      sendReadReceipt(lastMessage.id, activeConversationId);
      messageApi.updateStatus(lastMessage.id, 'read').catch(() => {});
    }

    // Socket event handlers
    const handleNewMessage = (data: any) => {
      if (data.conversation_id === activeConversationId) {
        queryClient.invalidateQueries({ queryKey: ['messages', activeConversationId] });
        queryClient.invalidateQueries({ queryKey: ['conversations'] });
        
        // Send delivered status
        if (data.sender_id !== user?.id) {
          sendDeliveredStatus(data.id);
          sendReadReceipt(data.id, activeConversationId);
        }
      }
    };

    const handleTyping = (data: any) => {
      if (data.conversation_id === activeConversationId) {
        setTypingUser(activeConversationId, data.user_id, data.is_typing);
      }
    };

    const handleMessageRead = (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['messages', activeConversationId] });
    };

    const handleMessageDelivered = (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['messages', activeConversationId] });
    };

    const handleUserOnline = (data: any) => {
      setUserOnline(data.user_id, data.is_online);
    };

    const handleUserOffline = (data: any) => {
      setUserOnline(data.user_id, false);
    };

    socket.on('new_message', handleNewMessage);
    socket.on('typing', handleTyping);
    socket.on('message_read', handleMessageRead);
    socket.on('message_delivered', handleMessageDelivered);
    socket.on('user_online', handleUserOnline);
    socket.on('user_offline', handleUserOffline);

    return () => {
      socket.off('new_message', handleNewMessage);
      socket.off('typing', handleTyping);
      socket.off('message_read', handleMessageRead);
      socket.off('message_delivered', handleMessageDelivered);
      socket.off('user_online', handleUserOnline);
      socket.off('user_offline', handleUserOffline);
      leaveConversation(activeConversationId);
    };
  }, [activeConversationId, messages, user?.id, queryClient, setTypingUser, setUserOnline]);

  const handleSendMessage = () => {
    if (!messageInput.trim() || !activeConversationId) return;

    sendSocketMessage({
      conversation_id: activeConversationId,
      content: messageInput.trim(),
    });

    setMessageInput('');
    setIsTyping(false);
    
    // Optimistic update
    queryClient.invalidateQueries({ queryKey: ['conversations'] });
  };

  const handleTypingInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessageInput(e.target.value);

    if (!isTyping) {
      setIsTyping(true);
      sendTyping(activeConversationId!, true);
    }

    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Send stop typing after 2 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      sendTyping(activeConversationId!, false);
    }, 2000);
  };

  const getConversationName = () => {
    if (conversation?.name) return conversation.name;
    const otherMember = conversation?.members.find(m => m.user_id !== user?.id);
    return otherMember?.user.display_name || 'Chat';
  };

  const getOtherMember = (): MemberUser | undefined => {
    return conversation?.members.find(m => m.user_id !== user?.id)?.user;
  };

  const isOtherOnline = () => {
    const other = getOtherMember();
    if (!other) return false;
    return onlineUsers[other.id] ?? other.is_online;
  };

  const getStatusText = () => {
    if (conversation?.is_group) {
      return `${conversation.members.length} members`;
    }
    if (isOtherOnline()) {
      return 'online';
    }
    const other = getOtherMember();
    if (other?.last_seen_at) {
      return `last seen ${formatMessageTime(other.last_seen_at)}`;
    }
    return 'offline';
  };

  const getMessageStatusIcon = (status: string) => {
    switch (status) {
      case 'sending':
        return <Clock size={14} className="text-gray-400" />;
      case 'sent':
        return <Check size={14} className="text-gray-400" />;
      case 'delivered':
        return <CheckCheck size={14} className="text-gray-400" />;
      case 'read':
        return <CheckCheck size={14} className="text-blue-500" />;
      default:
        return null;
    }
  };

  const groupMessagesByDate = (messages: Message[]) => {
    const groups: { date: string; messages: Message[] }[] = [];
    let currentGroup: { date: string; messages: Message[] } | null = null;

    messages.forEach((message) => {
      const dateKey = new Date(message.created_at).toDateString();
      if (!currentGroup || currentGroup.date !== dateKey) {
        currentGroup = { date: dateKey, messages: [] };
        groups.push(currentGroup);
      }
      currentGroup.messages.push(message);
    });

    return groups;
  };

  // Empty state
  if (!activeConversationId) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-[#F0F2F5] dark:bg-[#0F1419]">
        <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center mb-4">
          <Lock size={32} className="text-gray-400" />
        </div>
        <h2 className="text-xl font-semibold text-gray-600 mb-2">
          Signal Clone
        </h2>
        <p className="text-gray-500 text-center max-w-sm px-4">
          Select a conversation to start messaging. Your messages are end-to-end encrypted.
        </p>
      </div>
    );
  }

  const typingInConversation = typingUsers[activeConversationId] || [];
  const isTypingHere = typingInConversation.length > 0;

  return (
    <div className="h-full flex flex-col">
      {/* Chat Header */}
      <div className="h-16 bg-[#F0F2F5] dark:bg-[#1F2C34] border-b border-gray-200 dark:border-gray-700 flex items-center px-4 flex-shrink-0">
        <button
          onClick={() => setActiveConversation(null)}
          className="md:hidden p-2 -ml-2 mr-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"
        >
          <ArrowLeft size={20} className="text-gray-600" />
        </button>

        <div className="relative">
          <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200">
            {conversation?.avatar_url ? (
              <img src={conversation.avatar_url} alt={getConversationName()} className="w-full h-full object-cover" />
            ) : conversation?.is_group ? (
              <div className="w-full h-full flex items-center justify-center bg-gray-300">
                <span className="text-gray-600 font-semibold text-sm">
                  {getInitials(getConversationName())}
                </span>
              </div>
            ) : (
              <div className={cn(
                "w-full h-full flex items-center justify-center text-white font-semibold",
                stringToColor(getOtherMember()?.username || 'unknown')
              )}>
                {getInitials(getConversationName())}
              </div>
            )}
          </div>
          {!conversation?.is_group && isOtherOnline() && (
            <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-[#F0F2F5] dark:border-[#1F2C34] rounded-full" />
          )}
        </div>

        <div className="ml-3 flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 dark:text-white truncate">
            {getConversationName()}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {isTypingHere ? (
              <span className="text-signal-blue">typing...</span>
            ) : (
              getStatusText()
            )}
          </p>
        </div>

        <div className="flex items-center gap-1">
          <button className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors" onClick={() => toast('Voice calls coming soon!')}>
            <Phone size={20} className="text-gray-600 dark:text-gray-300" />
          </button>
          <button className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors" onClick={() => toast('Video calls coming soon!')}>
            <Video size={20} className="text-gray-600 dark:text-gray-300" />
          </button>
          <button className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors">
            <MoreVertical size={20} className="text-gray-600 dark:text-gray-300" />
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-1 bg-[#E5DDD5] dark:bg-[#0F1419] custom-scrollbar">
        {messagesLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-6 h-6 border-2 border-signal-blue border-t-transparent rounded-full animate-spin" />
          </div>
        ) : messages && messages.length > 0 ? (
          groupMessagesByDate(messages).map((group) => (
            <div key={group.date}>
              {/* Date Header */}
              <div className="flex justify-center my-4">
                <span className="bg-[#99BEBA] dark:bg-[#2A3B45] text-white text-xs px-3 py-1 rounded-lg shadow-sm">
                  {formatDateHeader(group.date)}
                </span>
              </div>

              {group.messages.map((message, index) => {
                const isSent = message.sender_id === user?.id;
                const showAvatar = conversation?.is_group && !isSent;
                const prevMessage = index > 0 ? group.messages[index - 1] : null;
                const showSender = showAvatar && (!prevMessage || prevMessage.sender_id !== message.sender_id);

                return (
                  <div
                    key={message.id}
                    className={cn(
                      "flex mb-1",
                      isSent ? "justify-end" : "justify-start"
                    )}
                  >
                    <div className={cn(
                      "flex max-w-[75%] lg:max-w-[65%]",
                      isSent ? "flex-row" : "flex-row-reverse"
                    )}>
                      {/* Avatar for group messages */}
                      {showAvatar && (
                        <div className="flex-shrink-0 mr-2 self-end mb-1">
                          {showSender ? (
                            <div className={cn(
                              "w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-semibold",
                              stringToColor(message.sender.username)
                            )}>
                              {getInitials(message.sender.display_name)}
                            </div>
                          ) : (
                            <div className="w-7" />
                          )}
                        </div>
                      )}

                      <div className={cn(
                        "relative px-3 py-2 rounded-lg shadow-sm",
                        isSent 
                          ? "bg-[#DCF8C6] dark:bg-[#005C4B] rounded-tr-none" 
                          : "bg-white dark:bg-[#202C33] rounded-tl-none"
                      )}>
                        {/* Sender name in groups */}
                        {showSender && conversation?.is_group && (
                          <p className="text-xs text-signal-blue font-medium mb-1">
                            {message.sender.display_name}
                          </p>
                        )}

                        <p className={cn(
                          "text-sm leading-relaxed",
                          isSent ? "text-gray-900 dark:text-white" : "text-gray-900 dark:text-white"
                        )}>
                          {message.content}
                        </p>

                        <div className="flex items-center justify-end gap-1 mt-1">
                          <span className={cn(
                            "text-[10px]",
                            isSent ? "text-gray-500 dark:text-gray-300" : "text-gray-400"
                          )}>
                            {formatMessageTime(message.created_at)}
                          </span>
                          {isSent && getMessageStatusIcon(message.status)}
                          {message.is_encrypted && (
                            <Lock size={10} className="text-gray-400 ml-0.5" />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <p className="text-sm">No messages yet</p>
            <p className="text-xs mt-1">Send a message to start the conversation</p>
          </div>
        )}

        {/* Typing Indicator */}
        {isTypingHere && (
          <div className="flex justify-start mb-2">
            <div className="bg-white dark:bg-[#202C33] rounded-lg rounded-tl-none px-4 py-3 shadow-sm">
              <div className="flex gap-1">
                <span className="typing-dot" />
                <span className="typing-dot" />
                <span className="typing-dot" />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="h-16 bg-[#F0F2F5] dark:bg-[#1F2C34] border-t border-gray-200 dark:border-gray-700 px-4 flex items-center gap-2 flex-shrink-0">
        <button 
          className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"
          onClick={() => toast('Attachments coming soon!')}
        >
          <Paperclip size={20} className="text-gray-500" />
        </button>
        <button 
          className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"
          onClick={() => toast('Emoji picker coming soon!')}
        >
          <Smile size={20} className="text-gray-500" />
        </button>

        <input
          type="text"
          value={messageInput}
          onChange={handleTypingInput}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSendMessage();
            }
          }}
          placeholder="Type a message"
          className="flex-1 bg-white dark:bg-[#2A3B45] rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-signal-blue/20 dark:text-white placeholder:text-gray-400"
        />

        <button
          onClick={handleSendMessage}
          disabled={!messageInput.trim()}
          className={cn(
            "p-2 rounded-full transition-all",
            messageInput.trim() 
              ? "bg-signal-blue text-white hover:bg-signal-blue-dark" 
              : "bg-gray-200 text-gray-400 cursor-not-allowed"
          )}
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}