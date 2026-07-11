import React from 'react';
import { cn } from '../../lib/utils';

export function ChatLayout({ sidebar, area }) {
  return (
    <div className="flex h-full w-full overflow-hidden bg-background border rounded-lg shadow-sm">
      {/* Sidebar: hidden on small screens unless active (responsive handling can be added) */}
      <div className="w-full md:w-80 flex-shrink-0 border-r bg-card flex flex-col h-full">
        {sidebar}
      </div>
      
      {/* Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full bg-background relative">
        {area}
      </div>
    </div>
  );
}
