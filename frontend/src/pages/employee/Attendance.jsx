import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Play, Square, Coffee, Clock, Briefcase, Calendar as CalendarIcon, UserCheck } from 'lucide-react';
import { toast } from 'sonner';
import { attendanceService } from '../../services/attendance.service';
import { presenceService } from '../../services/presence.service';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatsCard } from '../../components/ui/StatsCard';
import { Timeline } from '../../components/ui/Timeline';
import { Calendar } from '../../components/ui/Calendar';
import { LiveTimer } from '../../components/ui/LiveTimer';

export default function EmployeeAttendance() {
  const [loading, setLoading] = useState(true);
  const [todayRecord, setTodayRecord] = useState(null);
  const [myPresence, setMyPresence] = useState(null);
  const [history, setHistory] = useState([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [todayRes, presenceRes, historyRes] = await Promise.all([
        attendanceService.getMyToday().catch(() => null),
        presenceService.getMyPresence().catch(() => null),
        attendanceService.getMyHistory({ month: currentMonth.getMonth() + 1, year: currentMonth.getFullYear() }).catch(() => null)
      ]);
      if (todayRes?.data) setTodayRecord(todayRes.data);
      if (presenceRes?.data) setMyPresence(presenceRes.data);
      if (historyRes?.data) setHistory(historyRes.data);
    } catch (error) {
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleStartWork = async () => {
    try {
      setProcessing(true);
      const res = await attendanceService.startWork();
      toast.success('Checked in successfully!');
      await fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error starting work');
    } finally {
      setProcessing(false);
    }
  };

  const handleEndWork = async () => {
    try {
      setProcessing(true);
      await attendanceService.endWork();
      toast.success('Checked out successfully!');
      await fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error ending work');
    } finally {
      setProcessing(false);
    }
  };

  const handleBreakToggle = async () => {
    try {
      setProcessing(true);
      if (myPresence?.status === 'On Break') {
        await attendanceService.breakEnd();
        toast.success('Welcome back from break!');
      } else {
        await attendanceService.breakStart();
        toast.success('Enjoy your break!');
      }
      await fetchData();
    } catch (error) {
      toast.error('Error toggling break');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Workforce Hub</h1>
          <p className="text-muted-foreground mt-1">Manage your remote sessions and presence</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-card border px-4 py-2 rounded-full shadow-sm">
            <span className="relative flex h-3 w-3">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${myPresence?.status === 'Working' ? 'bg-emerald-400' : myPresence?.status === 'On Break' ? 'bg-amber-400' : 'bg-gray-400'}`}></span>
              <span className={`relative inline-flex rounded-full h-3 w-3 ${myPresence?.status === 'Working' ? 'bg-emerald-500' : myPresence?.status === 'On Break' ? 'bg-amber-500' : 'bg-gray-500'}`}></span>
            </span>
            <span className="text-sm font-medium">{myPresence?.status || 'Offline'}</span>
          </div>
          
          <LiveTimer 
            startTime={todayRecord?.startWork} 
            isRunning={!!todayRecord?.startWork && !todayRecord?.endWork} 
          />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard title="Working Hours" value={todayRecord?.workingHours ? `${Math.floor(todayRecord.workingHours / 60)}h ${todayRecord.workingHours % 60}m` : '0h 0m'} icon={Clock} description="Today's total time" />
        <StatsCard title="Break Time" value={todayRecord?.totalBreakTime ? `${Math.floor(todayRecord.totalBreakTime / 60)}h ${todayRecord.totalBreakTime % 60}m` : '0h 0m'} icon={Coffee} description="Today's break usage" />
        <StatsCard title="Overtime" value={todayRecord?.overtimeHours ? `${Math.floor(todayRecord.overtimeHours / 60)}h ${todayRecord.overtimeHours % 60}m` : '0h 0m'} icon={Briefcase} description="Extra hours logged" />
        <StatsCard title="Attendance" value="95%" icon={UserCheck} description="Monthly average" />
      </div>

      <div className="grid gap-6 grid-cols-1 xl:grid-cols-3">
        {/* Actions & Timeline */}
        <div className="xl:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!todayRecord?.startWork || todayRecord?.endWork ? (
                <Button className="w-full bg-emerald-600 hover:bg-emerald-700" size="lg" onClick={handleStartWork} disabled={processing || !!todayRecord?.endWork}>
                  <Play className="mr-2 h-5 w-5" /> Check In
                </Button>
              ) : (
                <Button className="w-full" variant="destructive" size="lg" onClick={handleEndWork} disabled={processing}>
                  <Square className="mr-2 h-5 w-5" /> Check Out
                </Button>
              )}

              <Button 
                className="w-full" 
                variant="outline" 
                size="lg" 
                disabled={processing || !todayRecord?.startWork || !!todayRecord?.endWork}
                onClick={handleBreakToggle}
              >
                <Coffee className="mr-2 h-5 w-5" /> 
                {myPresence?.status === 'On Break' ? 'End Break' : 'Take a Break'}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Today's Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <Timeline events={todayRecord?.events || []} />
            </CardContent>
          </Card>
        </div>

        {/* Calendar */}
        <div className="xl:col-span-2">
          <Calendar 
            attendanceData={history} 
            currentMonth={currentMonth} 
            onPrevMonth={() => {
              const prev = new Date(currentMonth);
              prev.setMonth(prev.getMonth() - 1);
              setCurrentMonth(prev);
              fetchData();
            }} 
            onNextMonth={() => {
              const next = new Date(currentMonth);
              next.setMonth(next.getMonth() + 1);
              setCurrentMonth(next);
              fetchData();
            }} 
          />
        </div>
      </div>
    </div>
  );
}
