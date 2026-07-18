/**
 * Navigation sidebar component.
 */

'use client';

import { useRouter } from 'next/navigation';
import { 
  X, 
  Settings, 
  User, 
  Shield, 
  Bell, 
  Monitor, 
  Phone, 
  Image as ImageIcon, 
  LogOut
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { disconnectSocket } from '@/lib/socket';
import { authApi } from '@/lib/api';
import toast from 'react-hot-toast';
import { cn, getInitials, stringToColor } from '@/lib/utils';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch {
      // Ignore errors on logout
    }
    disconnectSocket();
    logout();
    toast.success('Logged out');
    // Force hard redirect to clear all state
    window.location.href = '/login';
  };

  const menuItems = [
    { icon: User, label: 'Profile', href: '/profile' },
    { icon: Settings, label: 'Settings', href: '/settings' },
    { icon: Shield, label: 'Privacy', href: '/settings?tab=privacy' },
    { icon: Bell, label: 'Notifications', href: '/settings?tab=notifications' },
    { icon: Monitor, label: 'Appearance', href: '/settings?tab=appearance' },
    { icon: Phone, label: 'Voice Calls', href: '#', comingSoon: true },
    { icon: ImageIcon, label: 'Stories', href: '#', comingSoon: true },
  ];

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/30 z-40 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div className={cn(
        "fixed md:static inset-y-0 left-0 z-50 w-[280px] bg-white border-r border-gray-200 flex flex-col transition-transform duration-300 ease-out",
        isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0 md:hidden"
      )}>
        {/* Header */}
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Menu</h2>
          <button 
            onClick={onClose}
            className="md:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* User Profile Summary */}
        {user && (
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold text-lg",
                stringToColor(user.username)
              )}>
                {user.avatar_url ? (
                  <img 
                    src={user.avatar_url} 
                    alt={user.display_name}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  getInitials(user.display_name)
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 truncate">{user.display_name}</p>
                <p className="text-sm text-gray-500 truncate">@{user.username}</p>
              </div>
            </div>
          </div>
        )}

        {/* Menu Items */}
        <nav className="flex-1 overflow-y-auto py-2">
          {menuItems.map((item) => (
            <button
              key={item.label}
              onClick={() => {
                if (!item.comingSoon) {
                  router.push(item.href);
                  onClose();
                } else {
                  toast('Coming soon!', { icon: '🔜' });
                }
              }}
              className="w-full flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-50 transition-colors text-left"
            >
              <item.icon size={20} className="text-gray-500" />
              <span className="flex-1">{item.label}</span>
              {item.comingSoon && (
                <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                  Soon
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut size={20} />
            <span className="font-medium">Log Out</span>
          </button>
        </div>
      </div>
    </>
  );
}