import React from 'react';
import { Menu, Search, Moon, Sun, Monitor, LogOut, Settings } from 'lucide-react';
import { Button } from '../ui/Button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '../ui/DropdownMenu';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/Avatar';
import { useDispatch, useSelector } from 'react-redux';
import { logoutUser } from '../../store/slices/authSlice';
import { useNavigate } from 'react-router-dom';
import { NotificationCenter } from '../ui/NotificationCenter';

export function TopNav({ toggleSidebar, onOpenCommandPalette }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector(state => state.auth);

  const handleLogout = () => {
    dispatch(logoutUser());
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-[var(--ent-border)] bg-[var(--ent-surface)]/80 px-4 backdrop-blur-xl md:px-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={toggleSidebar} className="md:hidden text-[var(--ent-text-secondary)]">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle Sidebar</span>
        </Button>
        <div className="hidden md:flex items-center gap-2">
          <div className="bg-white p-1.5 rounded-lg flex items-center gap-2">
            <img src="/ledgzo-books.jpg" alt="Ledgzo Books" className="w-6 object-contain" />
            <img src="/ledgzo-logo.jpg" alt="Ledgzo Logo" className="w-20 object-contain" />
          </div>
          <span className="ml-2 rounded-full bg-[var(--ent-primary)]/10 px-2 py-0.5 text-xs font-medium text-[var(--ent-primary)]">
            Production
          </span>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-end gap-2 md:gap-4">


        <NotificationCenter />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-8 w-8 rounded-full">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user?.profileImage} alt={user?.fullName} />
                <AvatarFallback>{user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}</AvatarFallback>
              </Avatar>
              {user?.isOnline && (
                <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-background bg-emerald-500" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{user?.fullName}</p>
                <p className="text-xs leading-none text-muted-foreground">
                  {user?.companyEmail}
                </p>
              </div>
            </DropdownMenuLabel>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
