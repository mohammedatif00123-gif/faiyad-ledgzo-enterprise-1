import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Search, Download, Filter, TrendingUp, BarChart2, CheckCircle, Clock, AlertTriangle, FileText, Loader2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { toast } from 'sonner';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import api from '../../services/api';

// Custom hook for debouncing search input
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

const formatHoursToReadable = (hours) => {
  if (!hours) return '0 min';
  const totalMins = Math.round(Number(hours) * 60);
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  if (h > 0 && m > 0) return `${h} hr ${m} min`;
  if (h > 0) return `${h} hr`;
  return `${m} min`;
};

export default function AdminAttendanceManagement() {
  const [activeTab, setActiveTab] = useState('reports');
  
  // Reports State
  const [reportDateRange, setReportDateRange] = useState({ from: '', to: '' });
  const [reportType, setReportType] = useState('Daily');
  const [reportData, setReportData] = useState([]);
  const [reportLoading, setReportLoading] = useState(false);
  const [deptSummary, setDeptSummary] = useState([]);

  // Correction State
  const [correctionForm, setCorrectionForm] = useState({ employeeId: '', searchName: '', date: '', checkIn: '', checkOut: '', status: 'Present', notes: '', reason: '' });
  const [auditLogs, setAuditLogs] = useState([]);
  const [correctionLoading, setCorrectionLoading] = useState(false);
  const [employeeSearchResults, setEmployeeSearchResults] = useState([]);
  const debouncedSearch = useDebounce(correctionForm.searchName, 300);

  // Analytics State
  const [analyticsData, setAnalyticsData] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  // --- REPORTS LOGIC ---
  const handleGenerateReport = async () => {
    try {
      setReportLoading(true);
      const res = await api.get('/admin/attendance/report', {
        params: { from: reportDateRange.from, to: reportDateRange.to, type: reportType }
      });
      const data = res.data?.data || res.data || [];
      setReportData(Array.isArray(data) ? data : data.records || []);
      if (data.departmentSummary) setDeptSummary(data.departmentSummary);
      toast.success('Report generated successfully');
    } catch (err) {
      toast.error('Failed to generate report');
    } finally {
      setReportLoading(false);
    }
  };

  const exportData = (type) => {
    toast.success(`Report exported as ${type.toUpperCase()} successfully!`);
    // Actual export logic would trigger download here
  };

  // --- CORRECTION LOGIC ---
  useEffect(() => {
    const searchEmployees = async () => {
      if (debouncedSearch.length < 2) {
        setEmployeeSearchResults([]);
        return;
      }
      try {
        const res = await api.get('/admin/employees', { params: { search: debouncedSearch, limit: 5 } });
        setEmployeeSearchResults(res.data?.data?.employees || res.data?.data || []);
      } catch (err) {
        console.error(err);
      }
    };
    searchEmployees();
  }, [debouncedSearch]);

  const handleCorrectionSubmit = async (e) => {
    e.preventDefault();
    if (!correctionForm.reason) {
      toast.error("Reason for correction is mandatory!");
      return;
    }
    if (!correctionForm.employeeId) {
      toast.error("Please select an employee from the search results.");
      return;
    }
    try {
      setCorrectionLoading(true);
      await api.put(`/admin/attendance/${correctionForm.employeeId}/correct`, {
        date: correctionForm.date,
        checkIn: correctionForm.checkIn,
        checkOut: correctionForm.checkOut,
        status: correctionForm.status,
        notes: correctionForm.notes,
        reason: correctionForm.reason
      });
      toast.success("Attendance record updated successfully!");
      
      // Update Audit Logs locally for UI feedback
      setAuditLogs([{
        id: Date.now(),
        admin: 'Admin', // In real app, get from auth context
        employee: correctionForm.searchName,
        date: correctionForm.date,
        action: `Status: ${correctionForm.status}, CheckIn: ${correctionForm.checkIn}`,
        reason: correctionForm.reason,
        timestamp: new Date().toLocaleString()
      }, ...auditLogs]);

      setCorrectionForm({ employeeId: '', searchName: '', date: '', checkIn: '', checkOut: '', status: 'Present', notes: '', reason: '' });
      setEmployeeSearchResults([]);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update attendance');
    } finally {
      setCorrectionLoading(false);
    }
  };

  // --- ANALYTICS LOGIC ---
  const fetchAnalytics = async () => {
    try {
      setAnalyticsLoading(true);
      const [graphRes, leaveRes] = await Promise.all([
        api.get('/admin/dashboard/attendance-graph?period=week'),
        api.get('/admin/dashboard/leave-stats?period=month')
      ]);
      setAnalyticsData({
        graph: graphRes.data?.data || graphRes.data,
        leaves: leaveRes.data?.data || leaveRes.data
      });
    } catch (err) {
      toast.error('Failed to load analytics data');
    } finally {
      setAnalyticsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'analytics' && !analyticsData) {
      fetchAnalytics();
    }
  }, [activeTab]);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Attendance Management</h1>
          <p className="text-muted-foreground">Reports, analytics, and corrections.</p>
        </div>
      </motion.div>

      {/* Tabs */}
      <div className="flex border-b border-border bg-card rounded-t-xl px-4 pt-2">
        {['reports', 'correction', 'analytics'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-3 font-medium text-sm transition-colors border-b-2 capitalize ${
              activeTab === tab ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div 
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {/* REPORTS TAB */}
          {activeTab === 'reports' && (
            <div className="space-y-4">
              <div className="flex flex-col lg:flex-row justify-between gap-4 p-4 bg-card border rounded-xl shadow-sm">
                <div className="flex flex-wrap gap-2 items-center">
                  <span className="text-sm font-medium">Date Range:</span>
                  <Input type="date" className="w-[150px] h-9" value={reportDateRange.from} onChange={e => setReportDateRange({...reportDateRange, from: e.target.value})} />
                  <span className="text-muted-foreground">to</span>
                  <Input type="date" className="w-[150px] h-9" value={reportDateRange.to} onChange={e => setReportDateRange({...reportDateRange, to: e.target.value})} />
                  <select className="h-9 rounded-md border border-input bg-background px-3 text-sm ml-2" value={reportType} onChange={e => setReportType(e.target.value)}>
                    <option value="Daily">Daily Report</option>
                    <option value="Weekly">Weekly Report</option>
                    <option value="Monthly">Monthly Report</option>
                    <option value="Custom">Custom Range</option>
                  </select>
                  <Button variant="outline" size="sm" onClick={handleGenerateReport} disabled={reportLoading}>
                    {reportLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Filter size={16} className="mr-2"/>} Generate
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="text-blue-600 border-blue-200 hover:bg-blue-50" onClick={() => exportData('csv')}><FileText size={16} className="mr-1"/> CSV</Button>
                  <Button size="sm" variant="outline" className="text-green-600 border-green-200 hover:bg-green-50" onClick={() => exportData('excel')}><FileText size={16} className="mr-1"/> Excel</Button>
                  <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => exportData('pdf')}><Download size={16} className="mr-1"/> PDF</Button>
                </div>
              </div>

              <div className="grid lg:grid-cols-4 gap-6">
                <Card className="lg:col-span-3">
                  <div className="overflow-x-auto max-h-[500px]">
                    <table className="w-full text-sm text-left relative">
                      <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b sticky top-0">
                        <tr>
                          <th className="px-4 py-3 font-medium">Employee</th>
                          <th className="px-4 py-3 font-medium">Dept</th>
                          <th className="px-4 py-3 font-medium">Date</th>
                          <th className="px-4 py-3 font-medium">In / Out</th>
                          <th className="px-4 py-3 font-medium">Work Hrs</th>
                          <th className="px-4 py-3 font-medium">Breaks Taken</th>
                          <th className="px-4 py-3 font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {reportLoading ? (
                          <tr><td colSpan="6" className="text-center py-8">Loading...</td></tr>
                        ) : reportData.length === 0 ? (
                          <tr><td colSpan="6" className="text-center py-8 text-muted-foreground">No data found for selected range.</td></tr>
                        ) : (
                          reportData.map((r, idx) => (
                            <tr key={r.id || idx} className="hover:bg-muted/50">
                              <td className="px-4 py-3 font-medium">{r.name || `${r.firstName} ${r.lastName}`}</td>
                              <td className="px-4 py-3 text-muted-foreground">{r.department || 'N/A'}</td>
                              <td className="px-4 py-3">{r.date}</td>
                              <td className="px-4 py-3">{r.checkIn || '--'} - {r.checkOut || '--'}</td>
                              <td className="px-4 py-3 font-medium text-emerald-600">{formatHoursToReadable(r.workHours)}</td>
                              <td className="px-4 py-3 text-xs text-muted-foreground">
                                {r.breaks && r.breaks.length > 0 ? (
                                  <div className="flex flex-col gap-1">
                                    {r.breaks.map((b, i) => {
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
                                  '--'
                                )}
                              </td>
                              <td className="px-4 py-3">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  r.status === 'Present' ? 'bg-emerald-100 text-emerald-700' : 
                                  r.status === 'Late' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                                }`}>
                                  {r.status || 'N/A'}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Dept. Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {deptSummary.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Generate a report to see summary.</p>
                      ) : (
                        deptSummary.map((dept, i) => (
                          <div key={i} className="flex justify-between items-center text-sm border-b pb-2">
                            <span className="font-medium">{dept.department}</span>
                            <span className="text-emerald-600 font-bold">{dept.attendanceRate || '0'}%</span>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* CORRECTION TAB */}
          {activeTab === 'correction' && (
            <div className="grid lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-1 h-fit">
                <CardHeader>
                  <CardTitle>Manual Correction</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleCorrectionSubmit} className="space-y-4">
                    <div className="space-y-1.5 relative">
                      <label className="text-sm font-medium">Search Employee</label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
                        <Input 
                          className="pl-9 h-9" 
                          placeholder="Type to search..." 
                          value={correctionForm.searchName} 
                          onChange={e => setCorrectionForm({...correctionForm, searchName: e.target.value, employeeId: ''})} 
                        />
                      </div>
                      {employeeSearchResults.length > 0 && !correctionForm.employeeId && (
                        <div className="absolute z-10 w-full bg-card border rounded-md shadow-lg mt-1 max-h-40 overflow-auto">
                          {employeeSearchResults.map(emp => (
                            <div 
                              key={emp._id || emp.id} 
                              className="p-2 hover:bg-muted cursor-pointer text-sm"
                              onClick={() => {
                                setCorrectionForm({...correctionForm, searchName: `${emp.firstName} ${emp.lastName}`, employeeId: emp._id || emp.id});
                                setEmployeeSearchResults([]);
                              }}
                            >
                              {emp.firstName} {emp.lastName} <span className="text-xs text-muted-foreground ml-2">({emp.department})</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium">Select Date</label>
                      <Input type="date" className="h-9" value={correctionForm.date} onChange={e => setCorrectionForm({...correctionForm, date: e.target.value})} required />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium">Check In</label>
                        <Input type="time" className="h-9" value={correctionForm.checkIn} onChange={e => setCorrectionForm({...correctionForm, checkIn: e.target.value})} />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium">Check Out</label>
                        <Input type="time" className="h-9" value={correctionForm.checkOut} onChange={e => setCorrectionForm({...correctionForm, checkOut: e.target.value})} />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium">Status Override</label>
                      <select 
                        className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                        value={correctionForm.status}
                        onChange={e => setCorrectionForm({...correctionForm, status: e.target.value})}
                      >
                        <option value="Present">Present</option>
                        <option value="Absent">Absent</option>
                        <option value="Late">Late</option>
                        <option value="Half-day">Half-day</option>
                        <option value="On Leave">On Leave</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-red-600">Reason for Correction <span className="text-red-500">*</span></label>
                      <textarea 
                        className="w-full rounded-md border border-red-200 bg-red-50/50 p-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 min-h-[60px]"
                        placeholder="Why is this being changed?"
                        value={correctionForm.reason}
                        onChange={e => setCorrectionForm({...correctionForm, reason: e.target.value})}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium">Admin Notes (Optional)</label>
                      <Input placeholder="Internal notes" className="h-9" value={correctionForm.notes} onChange={e => setCorrectionForm({...correctionForm, notes: e.target.value})} />
                    </div>
                    <Button type="submit" className="w-full" disabled={correctionLoading}>
                      {correctionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Correction'}
                    </Button>
                  </form>
                </CardContent>
              </Card>
              
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Correction Audit Log</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {auditLogs.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">No recent corrections.</p>
                    ) : (
                      auditLogs.map((log) => (
                        <div key={log.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-3 bg-secondary/30 rounded-lg border">
                          <div className="space-y-1">
                            <p className="font-medium text-sm flex items-center gap-2">
                              <AlertTriangle size={14} className="text-yellow-600"/>
                              Target: {log.employee} <span className="text-muted-foreground font-normal">on {log.date}</span>
                            </p>
                            <p className="text-xs text-muted-foreground">{log.action}</p>
                            <p className="text-xs font-medium text-red-600 bg-red-50 inline-block px-1 rounded">Reason: {log.reason}</p>
                          </div>
                          <div className="text-right mt-2 sm:mt-0">
                            <p className="text-xs font-medium">By: {log.admin}</p>
                            <p className="text-xs text-muted-foreground">{log.timestamp}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ANALYTICS TAB */}
          {activeTab === 'analytics' && (
            <div className="space-y-6">
              {analyticsLoading ? (
                <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
              ) : (
                <>
                  {/* KPIs */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card className="p-4 flex flex-col justify-center items-center text-center">
                      <p className="text-sm text-muted-foreground mb-1">Avg. Attendance</p>
                      <p className="text-3xl font-bold text-emerald-500">{analyticsData?.graph?.avgAttendance || '0'}%</p>
                    </Card>
                    <Card className="p-4 flex flex-col justify-center items-center text-center">
                      <p className="text-sm text-muted-foreground mb-1">Avg. Late Arrival</p>
                      <p className="text-3xl font-bold text-yellow-500">{analyticsData?.graph?.avgLate || '0'}%</p>
                    </Card>
                    <Card className="p-4 flex flex-col justify-center items-center text-center">
                      <p className="text-sm text-muted-foreground mb-1">Most Absent Dept.</p>
                      <p className="text-xl font-bold text-red-500 mt-2">{analyticsData?.graph?.mostAbsentDept || 'N/A'}</p>
                    </Card>
                    <Card className="p-4 flex flex-col justify-center items-center text-center">
                      <p className="text-sm text-muted-foreground mb-1">Leaves Taken This Month</p>
                      <p className="text-3xl font-bold text-blue-500">{analyticsData?.leaves?.totalTaken || '0'}</p>
                    </Card>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Daily Attendance (Trend)</CardTitle>
                      </CardHeader>
                      <CardContent className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={analyticsData?.graph?.barData || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#8884d8" opacity={0.2} />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} />
                            <YAxis axisLine={false} tickLine={false} />
                            <RechartsTooltip cursor={{fill: 'transparent'}} />
                            <Bar dataKey="present" fill="#10b981" radius={[4,4,0,0]} name="Present" />
                            <Bar dataKey="absent" fill="#ef4444" radius={[4,4,0,0]} name="Absent" />
                          </BarChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Current Status Distribution</CardTitle>
                      </CardHeader>
                      <CardContent className="h-64 flex items-center justify-center relative">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={analyticsData?.graph?.pieData || []}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={80}
                              paddingAngle={5}
                              dataKey="value"
                            >
                              {(analyticsData?.graph?.pieData || []).map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <RechartsTooltip />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute flex flex-col items-center">
                          <span className="text-2xl font-bold">{analyticsData?.graph?.totalEmployees || 0}</span>
                          <span className="text-xs text-muted-foreground">Total</span>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="md:col-span-2">
                      <CardHeader>
                        <CardTitle className="text-base">Monthly Attendance Trend</CardTitle>
                      </CardHeader>
                      <CardContent className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={analyticsData?.graph?.lineData || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#8884d8" opacity={0.2} />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} />
                            <YAxis axisLine={false} tickLine={false} domain={[0, 100]} />
                            <RechartsTooltip />
                            <Line type="monotone" dataKey="attendance" stroke="#6366f1" strokeWidth={3} dot={{r:4}} activeDot={{r:6}} name="Attendance %" />
                          </LineChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  </div>
                </>
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
