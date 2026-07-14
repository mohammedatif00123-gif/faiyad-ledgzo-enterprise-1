import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import { Clock, Coffee, LogOut, CheckCircle } from 'lucide-react';
import { checkIn, checkOut, getTodayAttendance } from '../../store/slices/attendanceSlice';
import { Button } from '../ui/Button';

export default function EmployeeDashboard() {
  const dispatch = useDispatch();
  const { today, loading } = useSelector((state) => state.attendance);
  const { user } = useSelector((state) => state.auth);

  useEffect(() => {
    dispatch(getTodayAttendance());
  }, [dispatch]);

  const handleCheckIn = () => dispatch(checkIn());
  const handleCheckOut = () => dispatch(checkOut());

  return (
    <div className="p-6 space-y-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-6 rounded-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-md border border-slate-200 dark:border-slate-800"
      >
        <h1 className="text-2xl font-bold mb-2">Welcome, {user?.firstName}</h1>
        <p className="text-muted-foreground mb-6">Manage your attendance and leave here.</p>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          
          <div className="bg-primary/10 p-4 rounded-xl flex items-center space-x-4 border border-primary/20">
            <div className="bg-primary text-white p-3 rounded-lg">
              <CheckCircle size={24} />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <p className="text-lg font-semibold">{today?.checkIn ? (today?.checkOut ? 'Checked Out' : 'Checked In') : 'Not Checked In'}</p>
            </div>
          </div>

          <div className="bg-orange-500/10 p-4 rounded-xl flex items-center space-x-4 border border-orange-500/20">
            <div className="bg-orange-500 text-white p-3 rounded-lg">
              <Clock size={24} />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Check In Time</p>
              <p className="text-lg font-semibold">
                {today?.checkIn ? new Date(today.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
              </p>
            </div>
          </div>

        </div>

        <div className="mt-8 flex space-x-4">
          {!today?.checkIn ? (
            <Button onClick={handleCheckIn} disabled={loading} size="lg" className="w-40">
              Check In
            </Button>
          ) : !today?.checkOut ? (
            <Button onClick={handleCheckOut} disabled={loading} variant="destructive" size="lg" className="w-40">
              Check Out
            </Button>
          ) : (
            <Button disabled size="lg" className="w-40 bg-green-500 text-white">
              Shift Completed
            </Button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
