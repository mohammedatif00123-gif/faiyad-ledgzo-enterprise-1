import React from 'react';
import { cn } from '../../lib/utils';

export function ChatLayout({ sidebar, area, isConversationActive }) {
  return (
    <div className="flex h-full w-full overflow-hidden bg-background border rounded-lg shadow-sm relative">
      {/* Sidebar: hidden on small screens if conversation is active */}
      <div className={`w-full md:w-80 flex-shrink-0 border-r bg-card flex-col h-full ${isConversationActive ? 'hidden md:flex' : 'flex'}`}>
        {sidebar}
      </div>
      
      {/* Chat Area: hidden on small screens if no conversation is active */}
      <div className={`flex-1 flex-col min-w-0 h-full bg-background relative ${!isConversationActive ? 'hidden md:flex' : 'flex'}`}>
        {area}
      </div>
    </div>
  );
}
