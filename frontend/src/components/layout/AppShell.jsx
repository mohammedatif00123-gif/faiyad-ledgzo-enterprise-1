import React, { useState } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { TopNav } from './TopNav';
import { Sidebar } from './Sidebar';
import { cn } from '../../lib/utils';
import { CommandPalette } from '../features/CommandPalette';

export function AppShell({ allowedRoles }) {
  const { user, accessToken } = useSelector(state => state.auth);
  const location = useLocation();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [utilityPanelOpen, setUtilityPanelOpen] = useState(false); // Hidden for now

  // Auth & Role protection
  if (!accessToken || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/403" replace />;
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* 1. Left Sidebar */}
      <Sidebar mobileOpen={mobileSidebarOpen} setMobileOpen={setMobileSidebarOpen} />

      {/* 2. Center Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopNav
          toggleSidebar={() => setMobileSidebarOpen(!mobileSidebarOpen)}
          onOpenCommandPalette={() => setCommandPaletteOpen(true)}
        />

        <main className="flex-1 overflow-y-auto bg-muted/20 p-4 md:p-6 scrollbar-hide">
          <div className="mx-auto max-w-7xl h-full animate-in fade-in duration-500">
            <Outlet />
          </div>
        </main>
      </div>


      {/* Command Palette */}
      <CommandPalette open={commandPaletteOpen} setOpen={setCommandPaletteOpen} />
    </div>
  );
}
