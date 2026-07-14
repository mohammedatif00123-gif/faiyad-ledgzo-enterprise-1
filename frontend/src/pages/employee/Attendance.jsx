import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Calendar as CalendarIcon, Filter, Loader2 } from 'lucide-react';
import api from '../../services/api';

export default function AttendanceHistory() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [historyData, setHistoryData] = useState([]);
  const [loading, setLoading] = useState(true);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const res = await api.get('/attendance/history', {
        params: { month: month + 1, year: year }
      });
      setHistoryData(res.data?.data || []);
    } catch (error) {
      console.error('Error fetching history:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [month, year]);

  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();

  const getDayStatus = (day) => {
    const dateToCheck = new Date(year, month, day);
    dateToCheck.setHours(0,0,0,0);
    const dayOfWeek = dateToCheck.getDay();
    
    // Check if it's weekend
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return 'weekend';
    }

    // Find if there is attendance data for this day
    const record = historyData.find(d => {
      const recDate = new Date(d.date);
      recDate.setHours(0,0,0,0);
      return recDate.getTime() === dateToCheck.getTime();
    });

    if (record) {
      return record.status.toLowerCase();
    }
    
    // If it's a past weekday and no record found, absent
    if (dateToCheck < new Date(new Date().setHours(0,0,0,0))) {
       return 'absent';
    }
    
    return 'upcoming';
  };

  const getColorClass = (status) => {
    switch(status) {
      case 'present': return 'bg-emerald-500/20 text-emerald-700 border-emerald-500/30';
      case 'absent': return 'bg-red-500/20 text-red-700 border-red-500/30';
      case 'late': return 'bg-yellow-500/20 text-yellow-700 border-yellow-500/30';
      case 'on-leave': return 'bg-blue-500/20 text-blue-700 border-blue-500/30';
      case 'half-day': return 'bg-purple-500/20 text-purple-700 border-purple-500/30';
      case 'weekend': return 'bg-slate-100 text-slate-400 border-slate-200 dark:bg-slate-800 dark:text-slate-500';
      default: return 'bg-transparent border-transparent text-muted-foreground';
    }
  };

  // Calculate summaries
  const summaries = { present: 0, absent: 0, late: 0, leave: 0 };
  for (let d = 1; d <= daysInMonth; d++) {
    const s = getDayStatus(d);
    if (s === 'present') summaries.present++;
    if (s === 'absent') summaries.absent++;
    if (s === 'late') summaries.late++;
    if (s === 'on-leave') summaries.leave++;
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-between items-center"
      >
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Attendance History</h1>
          <p className="text-muted-foreground">View your monthly attendance and leave records.</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-secondary rounded-lg font-medium text-sm">
          <Filter size={16} /> Filter
        </button>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Calendar View */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-2"
        >
          <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <CalendarIcon className="text-primary" /> {currentDate.toLocaleString('default', { month: 'long' })} {year}
                {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground ml-2" />}
              </CardTitle>
              <div className="flex gap-2">
                <button onClick={prevMonth} className="p-1 px-3 border rounded-md hover:bg-secondary text-sm">&lt; Prev</button>
                <button onClick={nextMonth} className="p-1 px-3 border rounded-md hover:bg-secondary text-sm">Next &gt;</button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-2 text-center mb-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="text-xs font-semibold text-muted-foreground py-2">{day}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-2">
                {/* Empty slots for starting day */}
                {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                  <div key={`empty-${i}`} className="p-2"></div>
                ))}
                
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                  const status = getDayStatus(day);
                  return (
                    <div 
                      key={day} 
                      className={`aspect-square flex flex-col items-center justify-center rounded-xl border p-2 cursor-pointer hover:scale-105 transition-transform ${getColorClass(status)}`}
                    >
                      <span className="font-bold text-lg">{day}</span>
                      <span className="text-[10px] uppercase font-bold tracking-wider mt-1 opacity-80 hidden sm:block truncate w-full text-center">
                        {status === 'upcoming' || status === 'weekend' ? '' : status.replace('-', ' ')}
                      </span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Summary Stats */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-6"
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Monthly Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <span className="font-medium text-emerald-700">Present Days</span>
                <span className="text-xl font-bold text-emerald-600">{summaries.present}</span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                <span className="font-medium text-red-700">Absent Days</span>
                <span className="text-xl font-bold text-red-600">{summaries.absent}</span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                <span className="font-medium text-yellow-700">Late Arrivals</span>
                <span className="text-xl font-bold text-yellow-600">{summaries.late}</span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <span className="font-medium text-blue-700">Leaves Taken</span>
                <span className="text-xl font-bold text-blue-600">{summaries.leave}</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

      </div>
    </div>
  );
}
