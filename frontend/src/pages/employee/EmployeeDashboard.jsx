import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import { Clock, Coffee, LogOut, CheckCircle, Calendar, Plus, CalendarDays, History } from 'lucide-react';
import { checkIn, checkOut, getTodayAttendance } from '../../store/slices/attendanceSlice';
import { updateUser } from '../../store/slices/authSlice';
import { getMyLeaves } from '../../store/slices/leaveSlice';
import { Button } from '../../components/ui/Button';
import AwayModal from '../../components/attendance/AwayModal';
import ApplyLeaveForm from '../../components/attendance/ApplyLeaveForm';
import { Avatar, AvatarFallback, AvatarImage } from '../../components/ui/Avatar';

export default function EmployeeDashboard() {
  const dispatch = useDispatch();
  const { today, loading } = useSelector((state) => state.attendance);
  const { myLeaves } = useSelector((state) => state.leaves);
  const { user } = useSelector((state) => state.auth);

  const [isAwayModalOpen, setIsAwayModalOpen] = useState(false);
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [onLeaveToday, setOnLeaveToday] = useState([]);

  useEffect(() => {
    dispatch(getTodayAttendance());
    dispatch(getMyLeaves());
    
    // Fetch colleagues on leave today
    import('../../services/api').then(module => {
      module.default.get('/attendance/on-leave-today')
        .then(res => setOnLeaveToday(res.data.data))
        .catch(console.error);
    });
  }, [dispatch]);

  const handleCheckIn = async () => {
    try {
      await dispatch(checkIn()).unwrap();
      dispatch(updateUser({ presenceStatus: 'online' }));
    } catch (e) {}
  };
  
  const handleCheckOut = async () => {
    try {
      await dispatch(checkOut()).unwrap();
      dispatch(updateUser({ presenceStatus: 'offline' }));
    } catch (e) {}
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'online': return 'bg-emerald-500';
      case 'away': return 'bg-yellow-500';
      case 'busy': return 'bg-purple-500';
      case 'in-meeting': return 'bg-blue-500';
      default: return 'bg-red-500';
    }
  };

  const getStatusLabel = (status) => {
    if (!status || status === 'offline') return 'Offline';
    return status.charAt(0).toUpperCase() + status.slice(1).replace('-', ' ');
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto pb-24 md:pb-6">
      
      {/* Header Section */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between p-6 rounded-2xl bg-gradient-to-r from-primary/10 via-background to-background border shadow-sm backdrop-blur-md"
      >
        <div className="flex items-center gap-4">
          <div className="relative">
            <Avatar className="h-16 w-16 border-2 border-primary/20">
              <AvatarImage src={user?.profileImage} />
              <AvatarFallback>{user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className={`absolute bottom-0 right-0 h-4 w-4 rounded-full border-2 border-background ${getStatusColor(user?.presenceStatus)}`}></div>
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{getGreeting()}, {user?.firstName}!</h1>
            <p className="text-muted-foreground flex items-center gap-2">
              <span className="font-medium text-foreground">{getStatusLabel(user?.presenceStatus)}</span> 
              {user?.awayReason && <span className="text-sm opacity-80">({user.awayReason})</span>}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={() => setIsAwayModalOpen(true)}>
            Set Status
          </Button>
          {!today?.checkIn ? (
            <Button onClick={handleCheckIn} disabled={loading} className="bg-emerald-600 hover:bg-emerald-700">
              <CheckCircle className="mr-2 h-4 w-4" /> Check In
            </Button>
          ) : !today?.checkOut ? (
            <Button onClick={handleCheckOut} disabled={loading} variant="destructive">
              <LogOut className="mr-2 h-4 w-4" /> Check Out
            </Button>
          ) : (
            <Button disabled className="bg-slate-500">
              Shift Completed
            </Button>
          )}
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Today's Stats */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="col-span-1 md:col-span-2 grid grid-cols-2 md:grid-cols-4 gap-4"
        >
          <div className="bg-card p-5 rounded-2xl border shadow-sm flex flex-col justify-center items-center text-center">
            <Clock className="text-primary mb-2 opacity-80" size={28} />
            <p className="text-sm text-muted-foreground">Check In</p>
            <p className="text-xl font-bold">{today?.checkIn ? new Date(today.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}</p>
          </div>
          <div className="bg-card p-5 rounded-2xl border shadow-sm flex flex-col justify-center items-center text-center">
            <LogOut className="text-red-500 mb-2 opacity-80" size={28} />
            <p className="text-sm text-muted-foreground">Check Out</p>
            <p className="text-xl font-bold">{today?.checkOut ? new Date(today.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}</p>
          </div>
          <div className="bg-card p-5 rounded-2xl border shadow-sm flex flex-col justify-center items-center text-center">
            <Coffee className="text-orange-500 mb-2 opacity-80" size={28} />
            <p className="text-sm text-muted-foreground">Break Taken</p>
            <p className="text-xl font-bold">0 mins</p>
          </div>
          <div className="bg-card p-5 rounded-2xl border shadow-sm flex flex-col justify-center items-center text-center">
            <History className="text-emerald-500 mb-2 opacity-80" size={28} />
            <p className="text-sm text-muted-foreground">Work Hours</p>
            <p className="text-xl font-bold">{today?.workHours || '0.0'} hr</p>
          </div>
        </motion.div>

        {/* Quick Actions */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-card p-6 rounded-2xl border shadow-sm"
        >
          <h3 className="font-semibold mb-4 text-lg">Quick Actions</h3>
          <div className="space-y-3">
            <Button variant="secondary" className="w-full justify-start" disabled={!today?.checkIn || today?.checkOut}>
              <Coffee className="mr-3 h-4 w-4 text-orange-500" /> Take Lunch Break
            </Button>
            <Button variant="secondary" className="w-full justify-start" disabled={!today?.checkIn || today?.checkOut}>
              <Coffee className="mr-3 h-4 w-4 text-blue-500" /> Short Break
            </Button>
            <Button variant="secondary" className="w-full justify-start bg-primary/10 text-primary hover:bg-primary/20" onClick={() => setIsLeaveModalOpen(true)}>
              <Plus className="mr-3 h-4 w-4" /> Apply Leave
            </Button>
          </div>
        </motion.div>

        {/* On Leave Today Widget */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="col-span-1 md:col-span-3 bg-card p-6 rounded-2xl border shadow-sm mt-2"
        >
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="text-red-500 w-5 h-5" />
            <h3 className="font-semibold text-lg">On Leave Today</h3>
          </div>
          {onLeaveToday.length > 0 ? (
            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
              {onLeaveToday.map(emp => (
                <div key={emp._id} className="flex items-center gap-3 p-3 border rounded-xl min-w-[200px]">
                  <Avatar className="h-10 w-10 border">
                    <AvatarImage src={emp.avatar} />
                    <AvatarFallback>{emp.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-semibold truncate">{emp.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{emp.leaveType} Leave</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">No colleagues are on leave today.</p>
          )}
        </motion.div>

      </div>

      {/* My Leave Requests Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-card p-6 rounded-2xl border shadow-sm mt-6"
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold text-lg">My Recent Leave Requests</h3>
          <Button variant="outline" size="sm" onClick={() => setIsLeaveModalOpen(true)}>
            Apply Leave
          </Button>
        </div>
        
        {myLeaves && myLeaves.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-muted/20">
                <tr>
                  <th className="px-4 py-3 rounded-tl-lg">Leave Type</th>
                  <th className="px-4 py-3">Duration</th>
                  <th className="px-4 py-3">Applied On</th>
                  <th className="px-4 py-3">Reason</th>
                  <th className="px-4 py-3 rounded-tr-lg">Status</th>
                </tr>
              </thead>
              <tbody>
                {myLeaves.slice(0, 5).map((leave, i) => (
                  <tr key={leave._id || i} className="border-b last:border-0 hover:bg-muted/10 transition-colors">
                    <td className="px-4 py-3 font-medium capitalize">{leave.type || leave.leaveType}</td>
                    <td className="px-4 py-3">
                      {new Date(leave.fromDate || leave.startDate).toLocaleDateString()} - {new Date(leave.toDate || leave.endDate).toLocaleDateString()}
                      <span className="ml-1 text-xs text-muted-foreground">({leave.totalDays} Days)</span>
                    </td>
                    <td className="px-4 py-3">{new Date(leave.appliedOn || leave.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3 max-w-[200px] truncate">{leave.reason}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-md text-xs font-semibold uppercase ${
                        leave.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                        leave.status === 'rejected' ? 'bg-red-100 text-red-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {leave.status || 'pending'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground bg-muted/10 rounded-xl border border-dashed">
            <CalendarDays size={32} className="mx-auto mb-3 opacity-20" />
            <p>You have no recent leave requests.</p>
          </div>
        )}
      </motion.div>

      {/* Modals */}
      <AwayModal isOpen={isAwayModalOpen} onClose={() => setIsAwayModalOpen(false)} />
      <ApplyLeaveForm isOpen={isLeaveModalOpen} onClose={() => setIsLeaveModalOpen(false)} />

    </div>
  );
}
