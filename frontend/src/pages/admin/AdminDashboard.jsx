import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Users, UserCheck, UserMinus, Calendar, Clock, Coffee, Video, Search, Filter, Download, Bell, Settings, ChevronDown, ChevronUp, MoreVertical, Building } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Avatar, AvatarFallback, AvatarImage } from '../../components/ui/Avatar';
import { useSocket } from '../../context/SocketContext';
import api from '../../services/api';
import { toast } from 'sonner';

// Custom hook for debouncing search input
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

const formatMinsToReadable = (mins) => {
  if (!mins || isNaN(Number(mins)) || Number(mins) === 0) return '0 min';
  const total = Number(mins);
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h > 0 && m > 0) return `${h} hr ${m} min`;
  if (h > 0) return `${h} hr`;
  return `${m} min`;
};

const formatHoursToReadable = (hours) => {
  if (!hours || hours === '--') return '--';
  return formatMinsToReadable(Math.round(Number(hours) * 60));
};

export default function AdminDashboard() {
  const [employees, setEmployees] = useState([]);
  const [stats, setStats] = useState({
    totalEmployees: { count: 0, change: 0 },
    online: { count: 0, change: 0 },
    away: { count: 0, change: 0 },
    offline: { count: 0, change: 0 },
    onLeave: { count: 0, change: 0 },
    late: { count: 0, change: 0 }
  });
  const [deptStats, setDeptStats] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 300);
  const [statusFilter, setStatusFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'asc' });

  const { socket } = useSocket();

  const fetchDashboardData = async () => {
    try {
      const [overviewRes, attendanceRes, deptRes] = await Promise.all([
        api.get('/admin/dashboard/overview'),
        api.get('/admin/attendance/all'),
        api.get('/admin/dashboard/department-stats')
      ]);

      if (overviewRes.data?.data) {
        setStats(overviewRes.data.data);
      } else if (overviewRes.data) {
        setStats(overviewRes.data);
      }

      if (attendanceRes.data?.data) {
        setEmployees(attendanceRes.data.data);
      } else if (attendanceRes.data) {
        setEmployees(attendanceRes.data);
      }

      if (deptRes.data?.data) {
        setDeptStats(deptRes.data.data);
      } else if (deptRes.data) {
        setDeptStats(deptRes.data);
      }
    } catch (err) {
      toast.error('Failed to load dashboard data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(() => {
      fetchDashboardData();
    }, 30000); // 30 seconds auto-refresh
    return () => clearInterval(interval);
  }, []);

  // Socket listener for real-time updates
  useEffect(() => {
    if (!socket) return;
    
    const handleStatusUpdate = (data) => {
      setEmployees(prev => prev.map(emp => {
        const empId = emp._id || emp.id;
        if (empId === data.userId) {
          let newStatus = data.presenceStatus || data.status || emp.status;
          // If socket disconnects (offline) but user is still checked in, keep them online
          if (newStatus.toLowerCase() === 'offline' && (emp.checkIn || emp.checkInTime) && !(emp.checkOut || emp.checkOutTime)) {
            newStatus = 'online';
          }
          return { 
            ...emp, 
            status: newStatus,
            awayReason: data.awayReason || null 
          };
        }
        return emp;
      }));
    };

    socket.on('user_status_changed', handleStatusUpdate);
    socket.on('attendance_update', fetchDashboardData);
    
    return () => {
      socket.off('user_status_changed', handleStatusUpdate);
      socket.off('attendance_update', fetchDashboardData);
    };
  }, [socket]);

  const getStatusColor = (status) => {
    const s = (status || '').toLowerCase();
    if (s.includes('online')) return 'bg-emerald-500';
    if (s.includes('away')) return 'bg-yellow-500';
    if (s.includes('busy')) return 'bg-purple-500';
    if (s.includes('meeting')) return 'bg-blue-500';
    if (s.includes('break')) return 'bg-orange-500';
    if (s.includes('offline')) return 'bg-red-500';
    return 'bg-slate-500';
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  const filteredAndSortedEmployees = useMemo(() => {
    let result = [...employees];
    
    if (debouncedSearch) {
      result = result.filter(emp => (emp.name || `${emp.firstName} ${emp.lastName}`).toLowerCase().includes(debouncedSearch.toLowerCase()));
    }
    if (statusFilter !== 'all') {
      result = result.filter(emp => (emp.status || '').toLowerCase().includes(statusFilter.toLowerCase()));
    }
    if (departmentFilter !== 'all') {
      result = result.filter(emp => emp.department === departmentFilter);
    }

    result.sort((a, b) => {
      let valA = a[sortConfig.key] || '';
      let valB = b[sortConfig.key] || '';
      
      if (sortConfig.key === 'name') {
        valA = a.name || `${a.firstName} ${a.lastName}`;
        valB = b.name || `${b.firstName} ${b.lastName}`;
      }

      if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
      if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [employees, debouncedSearch, statusFilter, departmentFilter, sortConfig]);

  const departments = [...new Set(employees.map(e => e.department).filter(Boolean))];

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Header Section */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-muted-foreground">Real-time attendance and workforce overview.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="gap-2"><Download size={16} /> Export</Button>
          <Button variant="outline" className="gap-2"><Settings size={16} /> Settings</Button>
        </div>
      </motion.div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { title: 'Total Employees', data: stats.totalEmployees, icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10' },
          { title: 'Online Now', data: stats.online, icon: UserCheck, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
          { title: 'Away', data: stats.away, icon: Coffee, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
          { title: 'Offline', data: stats.offline, icon: UserMinus, color: 'text-red-500', bg: 'bg-red-500/10' },
          { title: 'On Leave', data: stats.onLeave, icon: Calendar, color: 'text-blue-500', bg: 'bg-blue-500/10' },
          { title: 'Late Today', data: stats.late, icon: Clock, color: 'text-orange-500', bg: 'bg-orange-500/10' }
        ].map((stat, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.05 }}
            className="p-4 rounded-xl border bg-card shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden"
          >
            <div className="flex justify-between items-start mb-2">
              <div className={`p-2.5 rounded-xl ${stat.bg} ${stat.color}`}>
                <stat.icon size={20} />
              </div>
              {stat.data?.change !== undefined && (
                <span className={`text-xs font-semibold ${stat.data.change >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                  {stat.data.change >= 0 ? '+' : ''}{stat.data.change}%
                </span>
              )}
            </div>
            <div>
              <p className="text-3xl font-bold">{stat.data?.count || 0}</p>
              <p className="text-xs text-muted-foreground font-medium mt-1 uppercase tracking-wider">{stat.title}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Department Stats Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="lg:col-span-1 border rounded-xl bg-card shadow-sm overflow-hidden flex flex-col"
        >
          <div className="p-4 border-b bg-muted/20">
            <h2 className="text-lg font-semibold flex items-center gap-2"><Building size={18} className="text-primary"/> Department Overview</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-[400px]">
            {deptStats.length === 0 && !loading && (
              <p className="text-sm text-muted-foreground text-center py-4">No department stats available.</p>
            )}
            {deptStats.map((dept, i) => (
              <div key={i} className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="font-semibold">{dept.department}</span>
                  <span className="text-muted-foreground">{dept.present} / {dept.total} Present</span>
                </div>
                <div className="w-full h-2 bg-secondary rounded-full overflow-hidden flex">
                  <div className="bg-emerald-500 h-full" style={{ width: `${(dept.present / (dept.total || 1)) * 100}%` }}></div>
                  <div className="bg-blue-500 h-full" style={{ width: `${(dept.onLeave / (dept.total || 1)) * 100}%` }}></div>
                  <div className="bg-red-500 h-full" style={{ width: `${(dept.absent / (dept.total || 1)) * 100}%` }}></div>
                </div>
                <div className="flex gap-3 text-xs text-muted-foreground mt-1">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> Present</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500"></span> Leave: {dept.onLeave}</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500"></span> Absent: {dept.absent}</span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Live Employee Grid */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-2 space-y-4"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card p-4 rounded-xl border shadow-sm">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              Live Workforce
            </h2>
            <div className="flex flex-wrap gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                <Input 
                  placeholder="Search name..." 
                  className="pl-9 w-48 md:w-64"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <select 
                className="flex h-10 w-[120px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
              >
                <option value="all">All Depts</option>
                {departments.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <select 
                className="flex h-10 w-[120px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">Statuses</option>
                <option value="online">Online</option>
                <option value="away">Away</option>
                <option value="break">Break</option>
                <option value="meeting">Meeting</option>
                <option value="busy">Busy</option>
                <option value="offline">Offline</option>
              </select>
            </div>
          </div>

          <div className="border rounded-xl bg-card overflow-hidden shadow-sm max-h-[400px] overflow-y-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b sticky top-0 z-10 backdrop-blur-sm">
                <tr>
                  <th className="px-6 py-4 font-medium cursor-pointer hover:bg-muted/80 transition-colors" onClick={() => handleSort('name')}>
                    <div className="flex items-center gap-1">Employee {sortConfig.key === 'name' && (sortConfig.direction === 'asc' ? <ChevronUp size={14}/> : <ChevronDown size={14}/>)}</div>
                  </th>
                  <th className="px-6 py-4 font-medium cursor-pointer hover:bg-muted/80 transition-colors" onClick={() => handleSort('status')}>
                    <div className="flex items-center gap-1">Status & Activity {sortConfig.key === 'status' && (sortConfig.direction === 'asc' ? <ChevronUp size={14}/> : <ChevronDown size={14}/>)}</div>
                  </th>
                  <th className="px-6 py-4 font-medium cursor-pointer hover:bg-muted/80 transition-colors" onClick={() => handleSort('checkInTime')}>
                    <div className="flex items-center gap-1">Check In {sortConfig.key === 'checkInTime' && (sortConfig.direction === 'asc' ? <ChevronUp size={14}/> : <ChevronDown size={14}/>)}</div>
                  </th>
                  <th className="px-6 py-4 font-medium cursor-pointer hover:bg-muted/80 transition-colors" onClick={() => handleSort('checkOutTime')}>
                    <div className="flex items-center gap-1">Check Out {sortConfig.key === 'checkOutTime' && (sortConfig.direction === 'asc' ? <ChevronUp size={14}/> : <ChevronDown size={14}/>)}</div>
                  </th>
                  <th className="px-6 py-4 font-medium">Work Hrs</th>
                  <th className="px-6 py-4 font-medium">Break Time</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {loading && employees.length === 0 ? (
                  <tr><td colSpan="5" className="px-6 py-12 text-center text-muted-foreground">Loading workforce data...</td></tr>
                ) : filteredAndSortedEmployees.map((emp) => {
                  const empName = emp.name || `${emp.firstName || ''} ${emp.lastName || ''}`;
                  return (
                    <tr key={emp.id || emp._id} className="hover:bg-muted/50 transition-colors">
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <Avatar className="h-9 w-9">
                              <AvatarImage src={emp.profilePhoto || emp.profileImage} />
                              <AvatarFallback className="bg-primary/10 text-primary font-medium">{empName.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-background ${getStatusColor(emp.status)}`}></div>
                          </div>
                          <div>
                            <p className="font-semibold text-foreground">{empName}</p>
                            <p className="text-xs text-muted-foreground">{emp.department || 'N/A'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-3">
                        <div className="flex flex-col">
                          <span className="capitalize font-medium text-foreground">{(emp.status || 'Offline').replace('-', ' ')}</span>
                          {emp.awayReason ? (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              {emp.awayReason}
                            </span>
                          ) : emp.activity ? (
                            <span className="text-xs text-muted-foreground">{emp.activity}</span>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-6 py-3 font-medium">
                        {emp.checkInTime || emp.checkIn 
                          ? new Date(emp.checkInTime || emp.checkIn).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) 
                          : '--'}
                      </td>
                      <td className="px-6 py-3 font-medium text-muted-foreground">
                        {emp.checkOutTime || emp.checkOut 
                          ? new Date(emp.checkOutTime || emp.checkOut).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) 
                          : '--'}
                      </td>
                      <td className="px-6 py-3 font-medium text-emerald-600">{formatHoursToReadable(emp.workHours)}</td>
                      <td className="px-6 py-3 text-muted-foreground">
                        {emp.breaks && emp.breaks.length > 0 ? (
                          <div className="flex flex-col gap-1 text-xs">
                            {emp.breaks.map((b, i) => {
                              const duration = b.durationMinutes ? `${b.durationMinutes} min` : 'Ongoing';
                              const isLongShortBreak = b.type.includes('short-break') && b.durationMinutes > 15;
                              return (
                                <span key={i} className={`capitalize ${isLongShortBreak ? 'text-red-500 font-bold' : ''}`}>
                                  {b.type.replace('-', ' ')}: <span className="font-semibold">{duration}</span>
                                </span>
                              );
                            })}
                          </div>
                        ) : (
                          typeof emp.breakTime === 'number' ? formatMinsToReadable(emp.breakTime) : typeof emp.breakTime === 'string' && emp.breakTime.includes('mins') ? formatMinsToReadable(parseInt(emp.breakTime) || 0) : (emp.breakTime || emp.breakTaken || '--')
                        )}
                      </td>
                    </tr>
                  )
                })}
                {!loading && filteredAndSortedEmployees.length === 0 && (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center justify-center text-muted-foreground">
                        <Search size={32} className="mb-2 opacity-50" />
                        <p>No employees found matching your criteria.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
