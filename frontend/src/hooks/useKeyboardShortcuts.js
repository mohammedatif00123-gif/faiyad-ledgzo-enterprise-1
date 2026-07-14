import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useSelector } from 'react-redux';
import { selectCurrentUser } from '../store/slices/authSlice';

export function useKeyboardShortcuts() {
  const navigate = useNavigate();
  const user = useSelector(selectCurrentUser);

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Check-in shortcut: Ctrl + Shift + I
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'i') {
        e.preventDefault();
        if (user?.role === 'Employee') {
          navigate('/employee/attendance');
          toast.info("Keyboard Shortcut: Navigate to Check-in");
        }
      }
      
      // Check-out shortcut: Ctrl + Shift + O
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'o') {
        e.preventDefault();
        if (user?.role === 'Employee') {
          navigate('/employee/attendance');
          toast.info("Keyboard Shortcut: Navigate to Check-out");
        }
      }

      // Apply Leave shortcut: Ctrl + Shift + L
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'l') {
        e.preventDefault();
        if (user?.role === 'Employee') {
          // Employee leave is in dashboard usually, or we can trigger modal
          navigate('/employee');
          toast.info("Keyboard Shortcut: Apply Leave");
        } else if (user?.role === 'Admin') {
          navigate('/admin/leaves');
          toast.info("Keyboard Shortcut: Leave Approvals");
        }
      }

      // Global Search shortcut: Ctrl + K
      if (e.ctrlKey && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        // Typically opens a global search modal. If we have one, we trigger it here.
        // For now, we can focus the search input if on a specific page
        const searchInput = document.querySelector('input[placeholder*="Search"]');
        if (searchInput) {
          searchInput.focus();
        } else {
          toast.info("Global search coming soon!");
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate, user]);
}
