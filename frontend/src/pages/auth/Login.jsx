import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, Loader2, Shield, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { useDispatch } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../../services/api';
import { setCredentials } from '../../store/slices/authSlice';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Label } from '../../components/ui/Label';
import { ROLES, ROUTES } from '../../constants';

const loginSchema = z.object({
  companyEmail: z.string().email('Please enter a valid company email'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional(),
});

const Login = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('Employee'); // 'Employee' or 'Admin'
  
  const dispatch = useDispatch();
  const navigate = useNavigate();
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      companyEmail: '',
      password: '',
      rememberMe: false,
    },
  });

  const onSubmit = async (data) => {
    try {
      setIsLoading(true);
      const res = await api.post('/auth/login', data);
      
      const { user, accessToken } = res.data.data;
      
      if (user.role !== activeTab) {
        toast.error(`You are trying to log in as ${activeTab} but your account is an ${user.role}.`);
        setIsLoading(false);
        return;
      }

      dispatch(setCredentials({ user, accessToken }));
      toast.success(`Welcome back, ${user.firstName}!`);

      if (user.isFirstLogin || user.mustChangePassword) {
        navigate(ROUTES.CHANGE_PASSWORD, { replace: true });
        return;
      }

      // Always send to their respective dashboard
      if (user.role === ROLES.ADMIN) {
        navigate(ROUTES.ADMIN_DASHBOARD, { replace: true });
      } else {
        navigate(ROUTES.EMPLOYEE_DASHBOARD, { replace: true });
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to login');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex w-full bg-white dark:bg-gray-950">
      {/* Left Panel - Branding & Info (Hidden on mobile) */}
      <div className="hidden lg:flex w-1/2 bg-primary relative overflow-hidden flex-col justify-between p-12 lg:p-16">
        {/* Background Decorative Elements */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-indigo-900 mix-blend-multiply opacity-90 pointer-events-none" />
        <div className="absolute -bottom-1/4 -left-1/4 w-[150%] h-[150%] bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent blur-3xl pointer-events-none" />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-white/5 blur-3xl rounded-full mix-blend-screen pointer-events-none" />
        
        {/* Header / Logo */}
        <div className="relative z-10 flex items-center">
          <div className="bg-white p-2 px-3 rounded-xl shadow-xl flex items-center gap-2">
            <img src="/ledgzo-books.jpg" alt="Ledgzo Books" className="w-8 object-contain" />
            <img src="/ledgzo-logo.jpg" alt="Ledgzo Logo" className="w-24 object-contain" />
          </div>
        </div>

        {/* Center Content */}
        <div className="relative z-10 max-w-lg mt-auto mb-32 flex flex-col items-start">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="flex flex-col gap-6"
          >

            <h2 className="text-4xl lg:text-5xl font-bold text-white mb-2 leading-tight">
              Empower your enterprise workforce.
            </h2>
            <p className="text-lg text-blue-100/80 mb-6 leading-relaxed font-light">
              Ledgzo brings your team's communication, productivity, and organization into one secure, unified space. Connect effortlessly and scale confidently.
            </p>
          </motion.div>
        </div>

        {/* Footer */}
        <div className="relative z-10 text-sm text-blue-200/50 font-medium">
          &copy; {new Date().getFullYear()} Ledgzo Enterprise. All rights reserved.
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 relative bg-gray-50 dark:bg-gray-950">
        {/* Subtle background for mobile only */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-600/5 lg:hidden pointer-events-none" />
        
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="w-full max-w-md z-10"
        >
          {/* Mobile Logo */}
          <div className="flex lg:hidden flex-col items-center justify-center gap-4 mb-10">
            <div className="bg-white p-2 px-3 rounded-xl shadow-lg flex items-center gap-2">
              <img src="/ledgzo-books.jpg" alt="Ledgzo Books" className="w-8 object-contain" />
              <img src="/ledgzo-logo.jpg" alt="Ledgzo Logo" className="w-24 object-contain" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 shadow-2xl rounded-3xl p-8 border border-gray-100 dark:border-gray-800">
            <div className="text-left mb-8">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Welcome back</h1>
              <p className="text-gray-500 dark:text-gray-400 mt-2 text-sm">Please enter your details to sign in.</p>
            </div>

            <div className="flex bg-muted/50 p-1 rounded-xl mb-8 relative">
              <button
                type="button"
                onClick={() => { setActiveTab('Employee'); reset(); }}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-lg transition-all z-10 ${activeTab === 'Employee' ? 'text-primary shadow-sm bg-white dark:bg-gray-800' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <Users className="w-4 h-4" /> Employee
              </button>
              <button
                type="button"
                onClick={() => { setActiveTab('Admin'); reset(); }}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-lg transition-all z-10 ${activeTab === 'Admin' ? 'text-primary shadow-sm bg-white dark:bg-gray-800' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <Shield className="w-4 h-4" /> Admin
              </button>
            </div>

            <AnimatePresence mode="wait">
              <motion.form 
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                onSubmit={handleSubmit(onSubmit)} 
                className="space-y-5"
              >
                <div className="space-y-2 text-left">
                  <Label htmlFor="companyEmail" className="text-gray-700 dark:text-gray-300">{activeTab} Email</Label>
                  <Input
                    id="companyEmail"
                    type="email"
                    placeholder={activeTab === 'Admin' ? "admin@ledgzo.com" : "name@ledgzo.com"}
                    {...register('companyEmail')}
                    className={`bg-gray-50 dark:bg-gray-950 border-gray-200 dark:border-gray-800 ${errors.companyEmail ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                  />
                  {errors.companyEmail && (
                    <p className="text-sm text-red-500">{errors.companyEmail.message}</p>
                  )}
                </div>

                <div className="space-y-2 text-left">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-gray-700 dark:text-gray-300">Password</Label>
                    <a href={ROUTES.FORGOT_PASSWORD} className="text-sm font-medium text-primary hover:text-primary/80 transition-colors">
                      Forgot password?
                    </a>
                  </div>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      {...register('password')}
                      className={`bg-gray-50 dark:bg-gray-950 border-gray-200 dark:border-gray-800 ${errors.password ? 'border-red-500 focus-visible:ring-red-500 pr-10' : 'pr-10'}`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-sm text-red-500">{errors.password.message}</p>
                  )}
                </div>

                <div className="flex items-center space-x-2 pt-2">
                  <input
                    type="checkbox"
                    id="rememberMe"
                    {...register('rememberMe')}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary focus:ring-offset-0 transition-all cursor-pointer"
                  />
                  <Label htmlFor="rememberMe" className="text-sm font-medium text-gray-600 dark:text-gray-400 cursor-pointer select-none">
                    Remember me for 30 days
                  </Label>
                </div>

                <Button type="submit" className="w-full mt-6 py-6 text-base font-semibold shadow-xl shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    `Sign In as ${activeTab}`
                  )}
                </Button>
              </motion.form>
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;
