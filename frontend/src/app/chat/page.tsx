/**
 * Main chat screen - the core messaging interface.
 * Layout: Left sidebar (conversation list) + Right panel (active chat).
 * Responsive: sidebar hidden on mobile when chat is active.
 */

'use client';

import { useState } from 'react';
import ConversationList from '@/components/ConversationList';
import ChatPanel from '@/components/ChatPanel';
import Sidebar from '@/components/Sidebar';

export default function ChatPage() {
  const [showSidebar, setShowSidebar] = useState(false);

  // Toggle sidebar instead of just opening
  const toggleSidebar = () => {
    setShowSidebar((prev) => !prev);
  };

  return (
    <div className="h-screen flex bg-white overflow-hidden">
      {/* Left Sidebar - Navigation */}
      <Sidebar 
        isOpen={showSidebar} 
        onClose={() => setShowSidebar(false)} 
      />

      {/* Conversation List */}
      <div className="w-full md:w-[380px] lg:w-[420px] flex-shrink-0 border-r border-gray-200 flex flex-col bg-white">
        <ConversationList 
          onMenuClick={toggleSidebar}
        />
      </div>

      {/* Chat Panel */}
      <div className="flex-1 flex flex-col bg-[#E5DDD5] dark:bg-[#0F1419] relative">
        <ChatPanel />
      </div>
    </div>
  );
}