import React from 'react';
import { cn } from '../../lib/utils';

export function ChatLayout({ sidebar, area, isConversationActive }) {
  return (
    <div className="flex h-full w-full overflow-hidden bg-[var(--ent-background)] relative border-t border-[var(--ent-border)]">
      {/* Sidebar: hidden on small screens if conversation is active */}
      <div className={`w-full sm:w-[320px] flex-shrink-0 border-r border-[var(--ent-border)] bg-[var(--ent-surface)] flex-col h-full ${isConversationActive ? 'hidden sm:flex' : 'flex'}`}>
        {sidebar}
      </div>
      
      {/* Chat Area: hidden on small screens if no conversation is active */}
      <div className={`flex-1 flex-col min-w-0 h-full bg-[var(--ent-background)] relative ${!isConversationActive ? 'hidden sm:flex' : 'flex'}`}>
        {area}
      </div>
    </div>
  );
}
