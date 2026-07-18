/**
 * Settings page - placeholder implementation for privacy, notifications, and appearance settings.
 * Matches Signal's settings categories with functional UI but placeholder backends.
 */

'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  ArrowLeft, 
  Shield, 
  Bell, 
  Palette, 
  Smartphone, 
  Lock, 
  Eye, 
  EyeOff,
  Moon,
  Sun,
  Volume2,
  VolumeX,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

type Tab = 'privacy' | 'notifications' | 'appearance';

interface SettingItem {
  id: string;
  label: string;
  description?: string;
  icon: React.ElementType;
  type: 'toggle' | 'link' | 'select';
  value?: boolean;
  options?: string[];
}

export default function SettingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get('tab') as Tab) || 'privacy';
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);

  // Placeholder settings state
  const [settings, setSettings] = useState({
    privacy_level: 'standard',
    read_receipts: true,
    typing_indicators: true,
    last_seen: true,
    profile_photo: 'contacts',
    notifications: true,
    sound: true,
    preview: true,
    dark_mode: false,
  });

  const tabs = [
    { id: 'privacy' as Tab, label: 'Privacy', icon: Shield },
    { id: 'notifications' as Tab, label: 'Notifications', icon: Bell },
    { id: 'appearance' as Tab, label: 'Appearance', icon: Palette },
  ];

  const handleToggle = (key: keyof typeof settings) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
    toast.success(`${key.replace(/_/g, ' ')} updated`);
  };

  const renderPrivacySettings = () => (
    <div className="space-y-4">
      <div className="bg-gray-50 rounded-xl p-4">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Lock size={18} className="text-signal-blue" />
          Messaging
        </h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Read Receipts</p>
              <p className="text-sm text-gray-500">Show when you&apos;ve read messages</p>
            </div>
            <button
              onClick={() => handleToggle('read_receipts')}
              className={cn(
                "w-12 h-7 rounded-full transition-colors relative",
                settings.read_receipts ? "bg-signal-blue" : "bg-gray-300"
              )}
            >
              <div className={cn(
                "absolute top-0.5 w-6 h-6 bg-white rounded-full shadow-sm transition-transform",
                settings.read_receipts ? "translate-x-5" : "translate-x-0.5"
              )} />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Typing Indicators</p>
              <p className="text-sm text-gray-500">Show when you&apos;re typing</p>
            </div>
            <button
              onClick={() => handleToggle('typing_indicators')}
              className={cn(
                "w-12 h-7 rounded-full transition-colors relative",
                settings.typing_indicators ? "bg-signal-blue" : "bg-gray-300"
              )}
            >
              <div className={cn(
                "absolute top-0.5 w-6 h-6 bg-white rounded-full shadow-sm transition-transform",
                settings.typing_indicators ? "translate-x-5" : "translate-x-0.5"
              )} />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Last Seen</p>
              <p className="text-sm text-gray-500">Show your online status</p>
            </div>
            <button
              onClick={() => handleToggle('last_seen')}
              className={cn(
                "w-12 h-7 rounded-full transition-colors relative",
                settings.last_seen ? "bg-signal-blue" : "bg-gray-300"
              )}
            >
              <div className={cn(
                "absolute top-0.5 w-6 h-6 bg-white rounded-full shadow-sm transition-transform",
                settings.last_seen ? "translate-x-5" : "translate-x-0.5"
              )} />
            </button>
          </div>
        </div>
      </div>

      <div className="bg-gray-50 rounded-xl p-4">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Eye size={18} className="text-signal-blue" />
          Profile
        </h3>
        
        <button
          onClick={() => toast('Profile photo settings coming soon!')}
          className="w-full flex items-center justify-between py-3 hover:bg-gray-100 rounded-lg px-2 transition-colors"
        >
          <div className="text-left">
            <p className="font-medium text-gray-900">Profile Photo</p>
            <p className="text-sm text-gray-500">Visible to: {settings.profile_photo}</p>
          </div>
          <ChevronRight size={18} className="text-gray-400" />
        </button>
      </div>

      <div className="bg-gray-50 rounded-xl p-4">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Smartphone size={18} className="text-signal-blue" />
          Linked Devices
        </h3>
        <p className="text-sm text-gray-500 mb-3">Manage devices linked to your account</p>
        <button
          onClick={() => toast('Linked devices coming soon!')}
          className="w-full py-2.5 bg-signal-blue text-white rounded-lg font-medium hover:bg-signal-blue-dark transition-colors"
        >
          Link a Device
        </button>
      </div>
    </div>
  );

  const renderNotificationSettings = () => (
    <div className="space-y-4">
      <div className="bg-gray-50 rounded-xl p-4">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Bell size={18} className="text-signal-blue" />
          Message Notifications
        </h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Notifications</p>
              <p className="text-sm text-gray-500">Receive push notifications</p>
            </div>
            <button
              onClick={() => handleToggle('notifications')}
              className={cn(
                "w-12 h-7 rounded-full transition-colors relative",
                settings.notifications ? "bg-signal-blue" : "bg-gray-300"
              )}
            >
              <div className={cn(
                "absolute top-0.5 w-6 h-6 bg-white rounded-full shadow-sm transition-transform",
                settings.notifications ? "translate-x-5" : "translate-x-0.5"
              )} />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Sound</p>
              <p className="text-sm text-gray-500">Play sound for new messages</p>
            </div>
            <button
              onClick={() => handleToggle('sound')}
              className={cn(
                "w-12 h-7 rounded-full transition-colors relative",
                settings.sound ? "bg-signal-blue" : "bg-gray-300"
              )}
            >
              <div className={cn(
                "absolute top-0.5 w-6 h-6 bg-white rounded-full shadow-sm transition-transform",
                settings.sound ? "translate-x-5" : "translate-x-0.5"
              )} />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Message Preview</p>
              <p className="text-sm text-gray-500">Show message content in notifications</p>
            </div>
            <button
              onClick={() => handleToggle('preview')}
              className={cn(
                "w-12 h-7 rounded-full transition-colors relative",
                settings.preview ? "bg-signal-blue" : "bg-gray-300"
              )}
            >
              <div className={cn(
                "absolute top-0.5 w-6 h-6 bg-white rounded-full shadow-sm transition-transform",
                settings.preview ? "translate-x-5" : "translate-x-0.5"
              )} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderAppearanceSettings = () => (
    <div className="space-y-4">
      <div className="bg-gray-50 rounded-xl p-4">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Palette size={18} className="text-signal-blue" />
          Theme
        </h3>
        
        <div className="space-y-3">
          <button
            onClick={() => {
              setSettings((prev) => ({ ...prev, dark_mode: false }));
              toast.success('Light mode enabled');
            }}
            className={cn(
              "w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all",
              !settings.dark_mode 
                ? "border-signal-blue bg-blue-50" 
                : "border-transparent bg-white hover:bg-gray-100"
            )}
          >
            <div className="w-10 h-10 bg-white border border-gray-200 rounded-lg flex items-center justify-center shadow-sm">
              <Sun size={20} className="text-amber-500" />
            </div>
            <div className="text-left">
              <p className="font-medium text-gray-900">Light</p>
              <p className="text-sm text-gray-500">Default light theme</p>
            </div>
          </button>

          <button
            onClick={() => {
              setSettings((prev) => ({ ...prev, dark_mode: true }));
              toast.success('Dark mode enabled');
            }}
            className={cn(
              "w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all",
              settings.dark_mode 
                ? "border-signal-blue bg-blue-50" 
                : "border-transparent bg-white hover:bg-gray-100"
            )}
          >
            <div className="w-10 h-10 bg-gray-900 rounded-lg flex items-center justify-center shadow-sm">
              <Moon size={20} className="text-gray-300" />
            </div>
            <div className="text-left">
              <p className="font-medium text-gray-900">Dark</p>
              <p className="text-sm text-gray-500">Easier on the eyes</p>
            </div>
          </button>
        </div>
      </div>

      <div className="bg-gray-50 rounded-xl p-4">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Smartphone size={18} className="text-signal-blue" />
          Chat Wallpaper
        </h3>
        <p className="text-sm text-gray-500 mb-3">Customize your chat background</p>
        <button
          onClick={() => toast('Wallpaper customization coming soon!')}
          className="w-full py-2.5 bg-white border border-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
        >
          Change Wallpaper
        </button>
      </div>
    </div>
  );

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
        <h1 className="ml-4 font-semibold text-lg">Settings</h1>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors",
                activeTab === tab.id
                  ? "bg-signal-blue text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              )}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="animate-fade-in">
          {activeTab === 'privacy' && renderPrivacySettings()}
          {activeTab === 'notifications' && renderNotificationSettings()}
          {activeTab === 'appearance' && renderAppearanceSettings()}
        </div>
      </div>
    </div>
  );
}