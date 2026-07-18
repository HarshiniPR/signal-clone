/**
 * Modal for creating new group conversations.
 * Allows selecting group name and members from contacts.
 */

'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { X, Users, Check, Search } from 'lucide-react';
import { userApi, conversationApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { cn, getInitials, stringToColor } from '@/lib/utils';
import toast from 'react-hot-toast';

interface CreateGroupModalProps {
  onClose: () => void;
}

interface Contact {
  id: number;
  contact_id: number;
  contact: {
    id: number;
    username: string;
    display_name: string;
    avatar_url: string | null;
    is_online: boolean;
  };
}

export default function CreateGroupModal({ onClose }: CreateGroupModalProps) {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [groupName, setGroupName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<Set<number>>(new Set());
  const [isCreating, setIsCreating] = useState(false);

  const { data: contacts } = useQuery({
    queryKey: ['contacts'],
    queryFn: async () => {
      const response = await userApi.getContacts();
      return response.data as Contact[];
    },
  });

  const filteredContacts = contacts?.filter((contact) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      contact.contact.display_name.toLowerCase().includes(query) ||
      contact.contact.username.toLowerCase().includes(query)
    );
  });

  const toggleMember = (userId: number) => {
    const newSet = new Set(selectedMembers);
    if (newSet.has(userId)) {
      newSet.delete(userId);
    } else {
      newSet.add(userId);
    }
    setSelectedMembers(newSet);
  };

  const handleCreate = async () => {
    if (!groupName.trim()) {
      toast.error('Please enter a group name');
      return;
    }

    if (selectedMembers.size === 0) {
      toast.error('Please select at least one member');
      return;
    }

    setIsCreating(true);

    try {
      const memberIds = Array.from(selectedMembers);
      const response = await conversationApi.createGroup(groupName.trim(), memberIds);
      
      toast.success('Group created!');
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      
      // Close modal and optionally navigate to new group
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to create group');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[85vh] flex flex-col animate-fade-in">
        {/* Header */}
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">New Group</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Group Name Input */}
        <div className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
              <Users size={24} className="text-gray-500" />
            </div>
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Group name"
              className="flex-1 border-b border-gray-200 focus:border-signal-blue focus:outline-none py-2 text-lg font-medium"
              maxLength={100}
            />
          </div>
        </div>

        {/* Search Contacts */}
        <div className="px-4 pb-2">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search contacts..."
              className="w-full bg-gray-100 rounded-lg pl-9 pr-4 py-2 text-sm focus:ring-2 focus:ring-signal-blue/20 focus:outline-none"
            />
          </div>
        </div>

        {/* Members List */}
        <div className="flex-1 overflow-y-auto px-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-2 py-2">
            Contacts ({filteredContacts?.length || 0})
          </p>
          
          {filteredContacts?.map((contact) => {
            const isSelected = selectedMembers.has(contact.contact_id);
            
            return (
              <button
                key={contact.contact_id}
                onClick={() => toggleMember(contact.contact_id)}
                className={cn(
                  "w-full flex items-center gap-3 px-2 py-2 rounded-lg transition-colors text-left",
                  isSelected ? "bg-blue-50" : "hover:bg-gray-50"
                )}
              >
                <div className={cn(
                  "w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors",
                  isSelected 
                    ? "bg-signal-blue border-signal-blue" 
                    : "border-gray-300"
                )}>
                  {isSelected && <Check size={12} className="text-white" />}
                </div>

                <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
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

                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">
                    {contact.contact.display_name}
                  </p>
                  <p className="text-sm text-gray-500 truncate">
                    @{contact.contact.username}
                  </p>
                </div>
              </button>
            );
          })}

          {filteredContacts?.length === 0 && (
            <div className="text-center py-8 text-gray-400">
              <p className="text-sm">No contacts found</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100">
          <button
            onClick={handleCreate}
            disabled={isCreating || !groupName.trim() || selectedMembers.size === 0}
            className={cn(
              "w-full btn-signal flex items-center justify-center gap-2",
              (isCreating || !groupName.trim() || selectedMembers.size === 0) && "opacity-50 cursor-not-allowed"
            )}
          >
            {isCreating ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                Create Group
                {selectedMembers.size > 0 && ` (${selectedMembers.size})`}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}