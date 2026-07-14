import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { logoutUser, selectIsAuthenticated } from '../store/slices/authSlice';
import { toast } from 'sonner';

// Default timeout is 30 minutes
const TIMEOUT_MS = 30 * 60 * 1000;

export function useSessionTimeout(timeoutMs = TIMEOUT_MS) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const isAuthenticated = useSelector(selectIsAuthenticated);

  useEffect(() => {
    if (!isAuthenticated) return;

    let timeoutId;

    const resetTimeout = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        dispatch(logoutUser());
        toast.error("Your session has expired due to inactivity. Please log in again.");
        navigate('/login');
      }, timeoutMs);
    };

    // Events that indicate user activity
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];

    const handleUserActivity = () => {
      resetTimeout();
    };

    // Initial setup
    resetTimeout();

    // Attach event listeners
    events.forEach(event => {
      window.addEventListener(event, handleUserActivity);
    });

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      events.forEach(event => {
        window.removeEventListener(event, handleUserActivity);
      });
    };
  }, [isAuthenticated, dispatch, navigate, timeoutMs]);
}
