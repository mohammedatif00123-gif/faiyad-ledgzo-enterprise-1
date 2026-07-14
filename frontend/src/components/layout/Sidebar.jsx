import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, Clock, MessageSquare, Video, Mail, ChevronLeft, ChevronRight, CalendarDays, Settings, Bell, LogOut, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from '../ui/Button';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { logoutUser } from '../../store/slices/authSlice';
import { motion } from 'framer-motion';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/Tooltip';

const adminNavItems = [
  { title: 'Dashboard', icon: LayoutDashboard, href: '/admin' },
  { title: 'Employees', icon: Users, href: '/admin/employees' },
  { title: 'Attendance', icon: Clock, href: '/admin/attendance' },
  { title: 'Leaves', icon: CalendarDays, href: '/admin/leaves' },
  { title: 'Notifications', icon: Bell, href: '/admin/notifications' },
  { title: 'Meetings', icon: Video, href: '/employee/meetings', badge: 'Soon' },
  { title: 'Mailbox', icon: Mail, href: '/employee/mailbox', badge: 'Soon' },
  { title: 'Settings', icon: Settings, href: '/admin/settings' },
];

const employeeNavItems = [
  { title: 'Dashboard', icon: LayoutDashboard, href: '/employee' },
  { title: 'Attendance', icon: Clock, href: '/employee/attendance' },
  { title: 'Chats', icon: MessageSquare, href: '/employee/chats' },
  { title: 'Profile', icon: Users, href: '/employee/profile' },
  { title: 'Meetings', icon: Video, href: '/employee/meetings', badge: 'Soon' },
  { title: 'Mailbox', icon: Mail, href: '/employee/mailbox', badge: 'Soon' },
];

export function Sidebar({ mobileOpen, setMobileOpen }) {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebarCollapsed');
    return saved ? JSON.parse(saved) : false;
  });

  const { user } = useSelector(state => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const navItems = user?.role === 'Admin' ? adminNavItems : employeeNavItems;

  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', JSON.stringify(isCollapsed));
  }, [isCollapsed]);

  const toggleCollapse = () => setIsCollapsed(!isCollapsed);

  const handleLogout = () => {
    dispatch(logoutUser());
    navigate('/login');
  };

  const sidebarWidth = isCollapsed ? 'w-16' : 'w-64';

  const renderNavItem = (item) => {
    const Icon = item.icon;
    
    const content = (
      <NavLink
        key={item.href}
        to={item.href}
        end={item.href === '/admin' || item.href === '/employee'} // Only exact match for dashboard
        onClick={() => setMobileOpen && setMobileOpen(false)}
        className={({ isActive }) =>
          cn(
            'group flex items-center rounded-xl px-3 py-3 text-sm font-medium transition-all duration-200 border border-transparent',
            isActive 
              ? 'bg-blue-600 text-white shadow-md shadow-blue-900/20' 
              : 'text-slate-300 hover:bg-slate-800 hover:text-white hover:border-slate-700',
            isCollapsed ? 'justify-center py-3' : 'justify-start'
          )
        }
      >
        {({ isActive }) => (
          <>
            <Icon className={cn('h-[18px] w-[18px]', !isCollapsed && 'mr-3', isActive ? 'text-white' : 'text-slate-400 group-hover:text-blue-400 transition-colors')} />
            {!isCollapsed && <span className="flex-1">{item.title}</span>}
            {!isCollapsed && item.badge && (
              <span className="ml-auto inline-flex items-center rounded-full bg-blue-500/20 px-2 py-0.5 text-[10px] font-bold uppercase text-blue-300 border border-blue-500/30">
                {item.badge}
              </span>
            )}
          </>
        )}
      </NavLink>
    );

    if (isCollapsed) {
      return (
        <TooltipProvider delayDuration={0} key={item.href}>
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
        animate={{ width: isCollapsed ? 72 : 260 }}
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex h-full flex-col bg-slate-900 border-r border-slate-800 text-white shadow-2xl transition-transform duration-300 md:relative md:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
          isCollapsed ? 'w-[72px]' : 'w-[260px]'
        )}
      >
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMobileOpen(false)}
          className="absolute right-2 top-2 z-50 md:hidden text-slate-400 hover:text-white hover:bg-slate-800"
        >
          <X className="h-6 w-6" />
        </Button>

        <nav className="flex-1 space-y-1.5 overflow-y-auto px-3 pt-12 pb-6 md:pt-6 md:pb-6 scrollbar-hide">
          {navItems.map((item) => renderNavItem(item))}
        </nav>

        <div className="border-t border-slate-800 p-4 space-y-2">
          <Button
            variant="ghost"
            onClick={handleLogout}
            className={cn(
              "w-full flex items-center bg-red-500/10 border border-red-500/20 hover:bg-red-500 hover:text-white text-red-400 transition-all shadow-sm",
              isCollapsed ? "justify-center px-0 py-3" : "justify-start px-3 py-3"
            )}
          >
            <LogOut className={cn('h-5 w-5', !isCollapsed && 'mr-3')} />
            {!isCollapsed && <span className="text-sm font-medium flex-1 text-left">Log Out</span>}
          </Button>

          <Button
            variant="ghost"
            onClick={toggleCollapse}
            className={cn(
              "hidden h-10 w-full md:flex border border-slate-700 bg-slate-800/50 hover:bg-slate-800 text-slate-300 hover:text-white transition-all",
              isCollapsed ? "justify-center px-0" : "justify-between px-4"
            )}
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {!isCollapsed && <span className="text-sm font-medium">Collapse</span>}
            {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>
      </motion.aside>
    </>
  );
}
