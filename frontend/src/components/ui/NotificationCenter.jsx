import React, { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { Button } from './Button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from './DropdownMenu';
import { useSelector, useDispatch } from 'react-redux';
import { setNotifications, markAllAsRead } from '../../store/slices/notificationSlice';
import api from '../../services/api';

export function NotificationCenter() {
  const dispatch = useDispatch();
  const { notifications, unreadCount } = useSelector(state => state.notifications);

  useEffect(() => {
    api.get('/notifications')
      .then(res => dispatch(setNotifications(res.data.data)))
      .catch(console.error);
  }, [dispatch]);

  const handleMarkAllRead = () => {
    api.put('/notifications/read-all')
      .then(() => dispatch(markAllAsRead()))
      .catch(console.error);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 flex h-2 w-2 rounded-full bg-destructive" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between px-2 py-1.5">
          <DropdownMenuLabel className="p-0">Notifications</DropdownMenuLabel>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" className="h-auto p-0 text-xs text-primary" onClick={handleMarkAllRead}>
              Mark all as read
            </Button>
          )}
        </div>
        <DropdownMenuSeparator />
        <div className="max-h-[300px] overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">No new notifications</div>
          ) : (
            notifications.map(notification => (
              <DropdownMenuItem key={notification._id} className="flex flex-col items-start gap-1 p-3">
                <span className={`text-sm ${!notification.isRead ? 'font-semibold' : ''}`}>
                  {notification.title}
                </span>
                <span className="text-xs text-muted-foreground line-clamp-2">
                  {notification.body}
                </span>
                <span className="text-[10px] text-muted-foreground mt-1">
                  {new Date(notification.createdAt).toLocaleDateString()}
                </span>
              </DropdownMenuItem>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
