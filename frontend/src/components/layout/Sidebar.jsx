import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, Clock, MessageSquare, Video, Mail, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from '../ui/Button';
import { useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/Tooltip';

const adminNavItems = [
  { title: 'Dashboard', icon: LayoutDashboard, href: '/admin' },
  { title: 'Employees', icon: Users, href: '/admin/employees' },
  { title: 'Attendance', icon: Clock, href: '/admin/attendance' },
];

const employeeNavItems = [
  { title: 'Dashboard', icon: LayoutDashboard, href: '/employee' },
  { title: 'Attendance', icon: Clock, href: '/employee/attendance' },
  { title: 'Chats', icon: MessageSquare, href: '/employee/chats' },
  { title: 'Meetings', icon: Video, href: '/employee/meetings' },
  { title: 'Mailbox', icon: Mail, href: '/employee/mailbox' },
];

export function Sidebar({ mobileOpen, setMobileOpen }) {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebarCollapsed');
    return saved ? JSON.parse(saved) : false;
  });

  const { user } = useSelector(state => state.auth);
  const navItems = user?.role === 'Admin' ? adminNavItems : employeeNavItems;

  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', JSON.stringify(isCollapsed));
  }, [isCollapsed]);

  const toggleCollapse = () => setIsCollapsed(!isCollapsed);

  const sidebarWidth = isCollapsed ? 'w-16' : 'w-64';

  const NavItem = ({ item }) => {
    const Icon = item.icon;
    
    const content = (
      <NavLink
        to={item.href}
        onClick={() => setMobileOpen(false)}
        className={({ isActive }) =>
          cn(
            'group flex items-center rounded-md px-3 py-2 text-sm font-medium transition-all hover:bg-accent hover:text-accent-foreground',
            isActive ? 'bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground' : 'text-muted-foreground',
            isCollapsed ? 'justify-center' : 'justify-start'
          )
        }
      >
        <Icon className={cn('h-5 w-5', !isCollapsed && 'mr-3')} />
        {!isCollapsed && <span>{item.title}</span>}
      </NavLink>
    );

    if (isCollapsed) {
      return (
        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>{content}</TooltipTrigger>
            <TooltipContent side="right" className="z-50">{item.title}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }
    
    return content;
  };

  return (
    <>
      {/* Mobile Overlay */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar Content */}
      <motion.aside
        initial={false}
        animate={{ width: isCollapsed ? 64 : 256 }}
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex h-full flex-col border-r border-border bg-card transition-transform duration-300 md:relative md:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
          sidebarWidth
        )}
      >
        <div className="flex h-16 shrink-0 items-center justify-between border-b px-4">
          {!isCollapsed && (
            <div className="flex items-center gap-2 font-bold tracking-tight text-lg text-foreground">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                L
              </div>
              Ledgzo
            </div>
          )}
          {isCollapsed && (
            <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold">
              L
            </div>
          )}
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3 scrollbar-hide">
          {navItems.map((item) => (
            <NavItem key={item.href} item={item} />
          ))}
        </nav>

        <div className="border-t p-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleCollapse}
            className="hidden h-9 w-full md:flex"
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
          </Button>
        </div>
      </motion.aside>
    </>
  );
}
