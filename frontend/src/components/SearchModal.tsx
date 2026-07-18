/**
 * Search modal for finding users and starting new conversations.
 * Searches across contacts and all users, allows creating direct conversations.
 */

'use client';

import { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { X, Search, MessageCircle, UserPlus } from 'lucide-react';
import { userApi, conversationApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { useChatStore } from '@/store/chatStore';
import { cn, debounce, getInitials, stringToColor } from '@/lib/utils';
import toast from 'react-hot-toast';

interface SearchModalProps {
  onClose: () => void;
  onSelectConversation: (conversationId: number) => void;
}

interface UserResult {
  id: number;
  username: string;
  display_name: string;
  avatar_url: string | null;
  is_online: boolean;
}

interface ContactResult {
  id: number;
  contact_id: number;
  contact: UserResult;
}

export default function SearchModal({ onClose, onSelectConversation }: SearchModalProps) {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // Fetch contacts
  const { data: contacts } = useQuery({
    queryKey: ['contacts'],
    queryFn: async () => {
      const response = await userApi.getContacts();
      return response.data as ContactResult[];
    },
  });

  // Search users
  const { data: searchResults, isLoading: searchLoading } = useQuery({
    queryKey: ['userSearch', searchQuery],
    queryFn: async () => {
      if (!searchQuery.trim() || searchQuery.length < 2) return [];
      const response = await userApi.search(searchQuery);
      return response.data as UserResult[];
    },
    enabled: searchQuery.trim().length >= 2,
  });

  const handleStartChat = async (userId: number) => {
    try {
      const response = await conversationApi.createDirect(userId);
      const conversation = response.data;
      
      toast.success('Conversation started');
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      onSelectConversation(conversation.id);
      onClose();
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Failed to start conversation';
      toast.error(message);
    }
  };

  const handleAddContact = async (username: string) => {
    try {
      await userApi.addContact(username);
      toast.success('Contact added');
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to add contact');
    }
  };

  // Filter contacts based on search
  const filteredContacts = contacts?.filter((contact) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      contact.contact.display_name.toLowerCase().includes(query) ||
      contact.contact.username.toLowerCase().includes(query)
    );
  });

  const isContact = (userId: number) => {
    return contacts?.some((c) => c.contact_id === userId) ?? false;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[70vh] flex flex-col animate-fade-in">
        {/* Header */}
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-900">Search</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X size={20} className="text-gray-500" />
            </button>
          </div>

          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or username..."
              className="w-full bg-gray-100 rounded-lg pl-9 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-signal-blue/20 focus:outline-none focus:bg-white transition-all"
              autoFocus
            />
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto">
          {/* Contacts Section */}
          {(!searchQuery.trim() || searchQuery.length < 2) && filteredContacts && filteredContacts.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-2">
                Your Contacts
              </p>
              {filteredContacts.map((contact) => (
                <button
                  key={contact.contact_id}
                  onClick={() => handleStartChat(contact.contact_id)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                >
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full overflow-hidden">
                      {contact.contact.avatar_url ? (
                        <img
                          src={contact.contact.avatar_url}
                          alt={contact.contact.display_name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className={cn(
                          "w-full h-full flex items-center justify-center text-white font-semibold",
                          stringToColor(contact.contact.username)
                        )}>
                          {getInitials(contact.contact.display_name)}
                        </div>
                      )}
                    </div>
                    {contact.contact.is_online && (
                      <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900">{contact.contact.display_name}</p>
                    <p className="text-sm text-gray-500">@{contact.contact.username}</p>
                  </div>

                  <MessageCircle size={18} className="text-gray-400" />
                </button>
              ))}
            </div>
          )}

          {/* Search Results */}
          {searchQuery.trim().length >= 2 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-2">
                Search Results
              </p>

              {searchLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-5 h-5 border-2 border-signal-blue border-t-transparent rounded-full animate-spin" />
                </div>
              ) : searchResults && searchResults.length > 0 ? (
                searchResults
                  .filter((u) => u.id !== user?.id)
                  .map((result) => {
                    const alreadyContact = isContact(result.id);

                    return (
                      <div
                        key={result.id}
                        className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
                      >
                        <div className="relative">
                          <div className="w-10 h-10 rounded-full overflow-hidden">
                            {result.avatar_url ? (
                              <img
                                src={result.avatar_url}
                                alt={result.display_name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className={cn(
                                "w-full h-full flex items-center justify-center text-white font-semibold",
                                stringToColor(result.username)
                              )}>
                                {getInitials(result.display_name)}
                              </div>
                            )}
                          </div>
                          {result.is_online && (
                            <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900">{result.display_name}</p>
                          <p className="text-sm text-gray-500">@{result.username}</p>
                        </div>

                        <div className="flex items-center gap-1">
                          {!alreadyContact && (
                            <button
                              onClick={() => handleAddContact(result.username)}
                              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                              title="Add contact"
                            >
                              <UserPlus size={18} className="text-signal-blue" />
                            </button>
                          )}
                          <button
                            onClick={() => handleStartChat(result.id)}
                            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                            title="Start chat"
                          >
                            <MessageCircle size={18} className="text-signal-blue" />
                          </button>
                        </div>
                      </div>
                    );
                  })
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <p className="text-sm">No users found</p>
                </div>
              )}
            </div>
          )}

          {/* Empty state when no search and no contacts */}
          {(!searchQuery.trim() || searchQuery.length < 2) && (!filteredContacts || filteredContacts.length === 0) && (
            <div className="text-center py-8 text-gray-400">
              <Search size={32} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">Type to search for users</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}