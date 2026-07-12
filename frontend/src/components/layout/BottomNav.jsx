import React from 'react';
import { NavLink } from 'react-router-dom';
import { MessageSquare, PhoneCall, Video, FileText, User } from 'lucide-react';
import { useSelector } from 'react-redux';

export function BottomNav() {
  const { user } = useSelector(state => state.auth);
  
  const navItems = [
    { title: 'Chats', icon: MessageSquare, href: user?.role === 'Admin' ? '/admin/chats' : '/employee/chats' },
    { title: 'Calls', icon: PhoneCall, href: user?.role === 'Admin' ? '/admin/calls' : '/employee/calls' },
    { title: 'Meet', icon: Video, href: user?.role === 'Admin' ? '/admin/meetings' : '/employee/meetings' },
    { title: 'Files', icon: FileText, href: user?.role === 'Admin' ? '/admin/files' : '/employee/files' },
    { title: 'Profile', icon: User, href: user?.role === 'Admin' ? '/admin' : '/employee' },
  ];

  return (
    <div className="h-14 shrink-0 border-t border-[var(--ent-border)] bg-[var(--ent-surface)] flex items-center justify-around px-2 sm:px-6 z-40 relative">
      {navItems.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.href}
            to={item.href}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-1 min-w-[60px] h-full transition-colors ${
                isActive 
                  ? 'text-[var(--ent-primary)]' 
                  : 'text-[var(--ent-text-secondary)] hover:text-[var(--ent-text-primary)]'
              }`
            }
          >
            <Icon className="w-5 h-5" />
            <span className="text-[10px] font-medium">{item.title}</span>
          </NavLink>
        );
      })}
    </div>
  );
}
