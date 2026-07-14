import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { useSelector } from 'react-redux';
import { selectIsAuthenticated, selectTheme, selectCurrentUser } from './store/slices/authSlice';
import Login from './pages/auth/Login';
import { AppShell } from './components/layout/AppShell';
import { Error401, Error403, Error404, Error500 } from './pages/error/ErrorPages';
import { Skeleton } from './components/ui/Skeleton';
import { ROUTES } from './constants';
import { useSessionTimeout } from './hooks/useSessionTimeout';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';

// Lazy load feature pages
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const EmployeeManagement = lazy(() => import('./pages/admin/EmployeeManagement'));
const AdminAttendance = lazy(() => import('./pages/admin/AttendanceManagement'));
const LeaveApprovals = lazy(() => import('./pages/admin/LeaveApprovals'));
const SettingsPage = lazy(() => import('./pages/admin/SettingsPage'));
const NotificationsPage = lazy(() => import('./pages/admin/NotificationsPage'));
const EmployeeDashboard = lazy(() => import('./pages/employee/EmployeeDashboard'));
const EmployeeAttendance = lazy(() => import('./pages/employee/Attendance'));
const ChatPage = lazy(() => import('./pages/employee/ChatPage'));
const ProfileSettings = lazy(() => import('./pages/employee/ProfileSettings'));
const ChangePassword = lazy(() => import('./pages/auth/ChangePassword'));
const ComingSoon = lazy(() => import('./pages/error/ComingSoon'));
import { Video, Mail } from 'lucide-react';

function SuspenseLoader() {
  return (
    <div className="flex h-full w-full flex-col gap-4 p-4">
      <Skeleton className="h-10 w-[250px]" />
      <Skeleton className="h-[400px] w-full" />
    </div>
  );
}

function App() {
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const user = useSelector(selectCurrentUser);
  const theme = useSelector(selectTheme);

  // Apply hooks
  useSessionTimeout();
  useKeyboardShortcuts();

  React.useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    
    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      root.classList.add(systemTheme);
    } else {
      root.classList.add(theme);
    }
  }, [theme]);

  return (
    <>
      <Toaster position="top-right" theme={theme} richColors />
      <Routes>
        <Route 
          path={ROUTES.LOGIN} 
          element={!isAuthenticated ? <Login /> : <Navigate to={user?.role === 'Admin' ? ROUTES.ADMIN_DASHBOARD : ROUTES.EMPLOYEE_DASHBOARD} replace />} 
        />
        <Route 
          path={ROUTES.CHANGE_PASSWORD} 
          element={<Suspense fallback={<SuspenseLoader />}><ChangePassword /></Suspense>} 
        />
        <Route 
          path="/" 
          element={<Navigate to={isAuthenticated ? (user?.role === 'Admin' ? ROUTES.ADMIN_DASHBOARD : ROUTES.EMPLOYEE_DASHBOARD) : ROUTES.LOGIN} replace />} 
        />
        
        {/* Admin Routes */}
        <Route element={<AppShell allowedRoles={['Admin']} />}>
          <Route path="/admin" element={<Suspense fallback={<SuspenseLoader />}><AdminDashboard /></Suspense>} />
          <Route path="/admin/employees" element={<Suspense fallback={<SuspenseLoader />}><EmployeeManagement /></Suspense>} />
          <Route path="/admin/attendance" element={<Suspense fallback={<SuspenseLoader />}><AdminAttendance /></Suspense>} />
          <Route path="/admin/leaves" element={<Suspense fallback={<SuspenseLoader />}><LeaveApprovals /></Suspense>} />
          <Route path="/admin/settings" element={<Suspense fallback={<SuspenseLoader />}><SettingsPage /></Suspense>} />
          <Route path="/admin/notifications" element={<Suspense fallback={<SuspenseLoader />}><NotificationsPage /></Suspense>} />
        </Route>
        
        {/* Employee Routes */}
        <Route element={<AppShell allowedRoles={['Admin', 'Employee']} />}>
          <Route path="/employee" element={<Suspense fallback={<SuspenseLoader />}><EmployeeDashboard /></Suspense>} />
          <Route path="/employee/attendance" element={<Suspense fallback={<SuspenseLoader />}><EmployeeAttendance /></Suspense>} />
          <Route path="/employee/chats" element={<Suspense fallback={<SuspenseLoader />}><ChatPage /></Suspense>} />
          <Route path="/employee/profile" element={<Suspense fallback={<SuspenseLoader />}><ProfileSettings /></Suspense>} />
          {/* Future Modules Go Here */}
          <Route path="/employee/meetings" element={
            <Suspense fallback={<SuspenseLoader />}>
              <ComingSoon 
                title="Virtual Meetings" 
                description="High-quality video conferencing and meeting scheduling is currently under development. Stay tuned!"
                icon={Video}
              />
            </Suspense>
          } />
          <Route path="/employee/mailbox" element={
            <Suspense fallback={<SuspenseLoader />}>
              <ComingSoon 
                title="Internal Mailbox" 
                description="Secure internal email and notification management system is coming in the next major update."
                icon={Mail}
              />
            </Suspense>
          } />
        </Route>

        {/* Error Routes */}
        <Route path="/401" element={<Error401 />} />
        <Route path="/403" element={<Error403 />} />
        <Route path="/500" element={<Error500 />} />
        <Route path="*" element={<Error404 />} />
      </Routes>
    </>
  );
}

export default App;
