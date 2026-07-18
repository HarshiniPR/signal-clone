/**
 * User profile page - displays and allows editing of user profile information.
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Camera, Edit2, Check, X } from 'lucide-react';
import { userApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { cn, getInitials, stringToColor } from '@/lib/utils';
import toast from 'react-hot-toast';

export default function ProfilePage() {
  const router = useRouter();
  const { user: currentUser, updateUser } = useAuthStore();
  
  const [displayName, setDisplayName] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingStatus, setIsEditingStatus] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load current user data when component mounts or user changes
  useEffect(() => {
    if (currentUser) {
      console.log('[Profile] Loading user:', currentUser.username, 'Display:', currentUser.display_name);
      setDisplayName(currentUser.display_name || '');
      setStatusMessage(currentUser.status_message || '');
      setIsLoading(false);
    }
  }, [currentUser?.id, currentUser?.display_name, currentUser?.status_message]);

  const handleSaveName = async () => {
    if (!displayName.trim()) {
      toast.error('Name cannot be empty');
      return;
    }

    setIsSaving(true);
    try {
      await userApi.updateProfile({ display_name: displayName.trim() });
      updateUser({ display_name: displayName.trim() });
      toast.success('Name updated');
      setIsEditingName(false);
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to update');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveStatus = async () => {
    setIsSaving(true);
    try {
      await userApi.updateProfile({ status_message: statusMessage.trim() });
      updateUser({ status_message: statusMessage.trim() });
      toast.success('Status updated');
      setIsEditingStatus(false);
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to update');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading || !currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-8 h-8 border-2 border-signal-blue border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="h-14 bg-signal-blue flex items-center px-4 text-white">
        <button
          onClick={() => router.back()}
          className="p-2 -ml-2 hover:bg-white/10 rounded-full transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="ml-4 font-semibold text-lg">Profile</h1>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Avatar Section */}
        <div className="flex flex-col items-center mb-8">
          <div className="relative">
            <div className={cn(
              "w-32 h-32 rounded-full flex items-center justify-center text-white text-4xl font-bold shadow-lg",
              stringToColor(currentUser.username)
            )}>
              {currentUser.avatar_url ? (
                <img
                  src={currentUser.avatar_url}
                  alt={currentUser.display_name}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                getInitials(currentUser.display_name)
              )}
            </div>
            <button
              onClick={() => toast('Avatar upload coming soon!')}
              className="absolute bottom-0 right-0 w-10 h-10 bg-signal-blue text-white rounded-full flex items-center justify-center shadow-md hover:bg-signal-blue-dark transition-colors"
            >
              <Camera size={18} />
            </button>
          </div>
          <h2 className="mt-4 text-xl font-bold text-gray-900">{currentUser.display_name}</h2>
          <p className="text-gray-500">@{currentUser.username}</p>
        </div>

        {/* Profile Info */}
        <div className="space-y-6">
          {/* Display Name */}
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-signal-blue">Display Name</span>
              {!isEditingName && (
                <button
                  onClick={() => setIsEditingName(true)}
                  className="p-1.5 hover:bg-gray-200 rounded-full transition-colors"
                >
                  <Edit2 size={14} className="text-gray-500" />
                </button>
              )}
            </div>

            {isEditingName ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-signal-blue/20 focus:outline-none"
                  autoFocus
                />
                <button
                  onClick={handleSaveName}
                  disabled={isSaving}
                  className="p-2 bg-signal-blue text-white rounded-lg hover:bg-signal-blue-dark transition-colors"
                >
                  <Check size={16} />
                </button>
                <button
                  onClick={() => {
                    setDisplayName(currentUser.display_name || '');
                    setIsEditingName(false);
                  }}
                  className="p-2 bg-gray-200 text-gray-600 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <p className="text-lg font-semibold text-gray-900">{currentUser.display_name}</p>
            )}
          </div>

          {/* Status Message */}
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-signal-blue">About</span>
              {!isEditingStatus && (
                <button
                  onClick={() => setIsEditingStatus(true)}
                  className="p-1.5 hover:bg-gray-200 rounded-full transition-colors"
                >
                  <Edit2 size={14} className="text-gray-500" />
                </button>
              )}
            </div>

            {isEditingStatus ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={statusMessage}
                  onChange={(e) => setStatusMessage(e.target.value)}
                  placeholder="What's on your mind?"
                  className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-signal-blue/20 focus:outline-none"
                  autoFocus
                  maxLength={255}
                />
                <button
                  onClick={handleSaveStatus}
                  disabled={isSaving}
                  className="p-2 bg-signal-blue text-white rounded-lg hover:bg-signal-blue-dark transition-colors"
                >
                  <Check size={16} />
                </button>
                <button
                  onClick={() => {
                    setStatusMessage(currentUser.status_message || '');
                    setIsEditingStatus(false);
                  }}
                  className="p-2 bg-gray-200 text-gray-600 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <p className="text-gray-700">
                {currentUser.status_message || <span className="text-gray-400 italic">No status set</span>}
              </p>
            )}
          </div>

          {/* Phone Number */}
          <div className="bg-gray-50 rounded-xl p-4">
            <span className="text-sm font-medium text-signal-blue block mb-2">Phone Number</span>
            <p className="text-gray-900">{currentUser.phone_number}</p>
          </div>

          {/* Username */}
          <div className="bg-gray-50 rounded-xl p-4">
            <span className="text-sm font-medium text-signal-blue block mb-2">Username</span>
            <p className="text-gray-900">@{currentUser.username}</p>
          </div>
        </div>
      </div>
    </div>
  );
}