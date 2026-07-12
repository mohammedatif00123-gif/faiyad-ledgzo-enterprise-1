import React, { useState } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { TopNav } from './TopNav';
import { Sidebar } from './Sidebar';
import { cn } from '../../lib/utils';
import { CommandPalette } from '../features/CommandPalette';
import { useSocket } from '../../context/SocketContext';
import { IncomingCallModal } from '../call/IncomingCallModal';
import { OutgoingCallModal } from '../call/OutgoingCallModal';
import { VideoCallPage } from '../call/VideoCallPage';
import { AudioCallWidget } from '../call/AudioCallWidget';

import { BottomNav } from './BottomNav';

export function AppShell({ allowedRoles }) {
  const { user, accessToken } = useSelector(state => state.auth);
  const location = useLocation();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  
  const { socket } = useSocket();

  // Auth & Role protection
  if (!accessToken || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/403" replace />;
  }

  const isChatRoute = location.pathname.includes('/chats');

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden bg-[var(--ent-background)] text-[var(--ent-text-primary)] font-['Inter']">
      
      {/* Top: App header */}
      <div className={isChatRoute ? "md:hidden" : ""}>
        <TopNav
          toggleSidebar={() => setMobileSidebarOpen(!mobileSidebarOpen)}
          onOpenCommandPalette={() => setCommandPaletteOpen(true)}
        />
      </div>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Left Sidebar (Only for non-chat routes, if they still use it) */}
        {!isChatRoute && (
          <Sidebar mobileOpen={mobileSidebarOpen} setMobileOpen={setMobileSidebarOpen} />
        )}

        {/* Center Content Area */}
        <main className={`flex-1 overflow-y-auto scrollbar-hide flex flex-col ${isChatRoute ? 'p-0' : 'p-4 md:p-6 bg-muted/20'}`}>
          <div className={`${isChatRoute ? 'w-full h-full' : 'mx-auto max-w-7xl h-full'} animate-in fade-in duration-500`}>
            <Outlet />
          </div>
        </main>
      </div>

      {/* Bottom: Navigation bar */}
      {isChatRoute && (
        <div className="md:hidden">
          <BottomNav />
        </div>
      )}

      {/* Command Palette */}
      <CommandPalette open={commandPaletteOpen} setOpen={setCommandPaletteOpen} />
      
      {/* Global Call Modals and Overlays */}
      <IncomingCallModal socket={socket} />
      <OutgoingCallModal socket={socket} />
      <VideoCallPage socket={socket} />
      <AudioCallWidget socket={socket} />
    </div>
  );
}
