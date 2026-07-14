import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Bell, Send, Clock, CheckCircle, XCircle, Search, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
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

export default function NotificationsPage() {
  const [form, setForm] = useState({ title: '', message: '', type: 'System', recipientType: 'all', department: 'Engineering', employeeSearchName: '', employeeId: '', schedule: '' });
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  
  // Pagination for history
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Employee Search
  const [employeeSearchResults, setEmployeeSearchResults] = useState([]);
  const debouncedSearch = useDebounce(form.employeeSearchName, 300);

  useEffect(() => {
    fetchHistory();
  }, [currentPage]);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/notifications/history', { params: { page: currentPage, limit: itemsPerPage } });
      const data = res.data?.data || res.data;
      setHistory(Array.isArray(data) ? data : (data.notifications || []));
    } catch (err) {
      toast.error('Failed to load notification history');
    } finally {
      setLoading(false);
    }
  };

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
    if (form.recipientType === 'employee') {
      searchEmployees();
    }
  }, [debouncedSearch, form.recipientType]);

  const handleSend = async (e) => {
    e.preventDefault();
    if(!form.title || !form.message) {
      toast.error("Title and message are required.");
      return;
    }

    if (form.recipientType === 'employee' && !form.employeeId) {
      toast.error("Please select an employee from the search results.");
      return;
    }
    
    try {
      setSending(true);
      
      const payload = {
        title: form.title,
        message: form.message,
        type: form.type,
        recipientType: form.recipientType,
        schedule: form.schedule || null
      };

      if (form.recipientType === 'department') {
        payload.department = form.department;
      } else if (form.recipientType === 'employee') {
        payload.employeeId = form.employeeId;
      }

      await api.post('/admin/notifications/send', payload);
      
      toast.success(form.schedule ? "Notification scheduled successfully!" : "Notification sent successfully!");
      setForm({ title: '', message: '', type: 'System', recipientType: 'all', department: 'Engineering', employeeSearchName: '', employeeId: '', schedule: '' });
      setEmployeeSearchResults([]);
      
      // Refresh history
      setCurrentPage(1);
      fetchHistory();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send notification');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold tracking-tight">Notification Center</h1>
        <p className="text-muted-foreground">Broadcast messages, reminders, and system alerts.</p>
      </motion.div>

      <div className="grid md:grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Bell className="text-primary" size={20}/> Compose Message</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSend} className="space-y-4">
                
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Notification Type</label>
                  <div className="flex gap-4">
                    {['System', 'Reminder', 'Announcement'].map(type => (
                      <label key={type} className="flex items-center gap-2 text-sm cursor-pointer">
                        <input 
                          type="radio" 
                          name="type" 
                          className="text-primary focus:ring-primary"
                          checked={form.type === type}
                          onChange={() => setForm({...form, type})}
                        />
                        {type}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Send To</label>
                  <select 
                    className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                    value={form.recipientType}
                    onChange={(e) => setForm({...form, recipientType: e.target.value})}
                  >
                    <option value="all">All Employees</option>
                    <option value="department">Specific Department</option>
                    <option value="employee">Specific Employee</option>
                  </select>
                </div>

                {form.recipientType === 'department' && (
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Select Department</label>
                    <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={form.department} onChange={(e) => setForm({...form, department: e.target.value})}>
                      <option value="Engineering">Engineering</option>
                      <option value="Design">Design</option>
                      <option value="Sales">Sales</option>
                      <option value="HR">HR</option>
                      <option value="Marketing">Marketing</option>
                    </select>
                  </div>
                )}

                {form.recipientType === 'employee' && (
                  <div className="space-y-1.5 relative">
                    <label className="text-sm font-medium">Search Employee</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
                      <Input 
                        placeholder="E.g. Alice Smith" 
                        className="pl-9"
                        value={form.employeeSearchName} 
                        onChange={(e) => setForm({...form, employeeSearchName: e.target.value, employeeId: ''})} 
                      />
                    </div>
                    {employeeSearchResults.length > 0 && !form.employeeId && (
                      <div className="absolute z-10 w-full bg-card border rounded-md shadow-lg mt-1 max-h-40 overflow-auto">
                        {employeeSearchResults.map(emp => (
                          <div 
                            key={emp._id || emp.id} 
                            className="p-2 hover:bg-muted cursor-pointer text-sm"
                            onClick={() => {
                              setForm({...form, employeeSearchName: `${emp.firstName} ${emp.lastName}`, employeeId: emp._id || emp.id});
                              setEmployeeSearchResults([]);
                            }}
                          >
                            {emp.firstName} {emp.lastName} <span className="text-xs text-muted-foreground ml-2">({emp.department})</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Subject</label>
                  <Input placeholder="Message title" value={form.title} onChange={(e) => setForm({...form, title: e.target.value})} required />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Message Body</label>
                  <textarea 
                    className="w-full rounded-md border border-input bg-background p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary min-h-[100px]"
                    placeholder="Type your message here..."
                    value={form.message}
                    onChange={(e) => setForm({...form, message: e.target.value})}
                    required
                  />
                </div>

                <div className="space-y-1.5 p-4 bg-muted/20 border rounded-lg">
                  <label className="text-sm font-medium flex items-center gap-2"><Clock size={16}/> Schedule (Optional)</label>
                  <Input type="datetime-local" value={form.schedule} onChange={(e) => setForm({...form, schedule: e.target.value})} />
                </div>

                <Button type="submit" className="w-full gap-2" disabled={sending}>
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send size={16} />} 
                  {sending ? 'Sending...' : 'Send Notification'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
          <Card className="h-full flex flex-col">
            <CardHeader>
              <CardTitle>Recent Broadcasts</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col min-h-[400px]">
              <div className="space-y-4 flex-1">
                {loading ? (
                  <div className="flex justify-center items-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : history.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Bell size={32} className="mx-auto mb-2 opacity-50" />
                    <p>No notifications sent yet.</p>
                  </div>
                ) : (
                  history.map(item => {
                    let recipientText = 'All Employees';
                    if (item.recipientType === 'department') recipientText = item.department || 'Department';
                    if (item.recipientType === 'employee') recipientText = item.employeeName || 'Specific Employee';

                    return (
                      <div key={item._id || item.id} className="p-4 border rounded-lg bg-card shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-semibold text-foreground">{item.title}</h3>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            item.status === 'Delivered' ? 'bg-emerald-100 text-emerald-700' : 
                            item.status === 'Failed' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                          } flex items-center gap-1`}>
                            {item.status === 'Delivered' ? <CheckCircle size={12}/> : item.status === 'Failed' ? <XCircle size={12}/> : <Clock size={12}/>}
                            {item.status || 'Sent'}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground mb-3">
                          <span className="bg-secondary/50 px-2 py-1 rounded border">{item.type}</span>
                          <span className="bg-secondary/50 px-2 py-1 rounded border">To: {recipientText}</span>
                        </div>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock size={12}/> {new Date(item.schedule || item.createdAt || item.time).toLocaleString()}
                        </p>
                      </div>
                    )
                  })
                )}
              </div>
              
              {/* Simplified Pagination Controls for History */}
              <div className="mt-4 pt-4 border-t flex justify-between items-center">
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
                  <ChevronLeft size={16} className="mr-1"/> Prev
                </Button>
                <span className="text-sm text-muted-foreground">Page {currentPage}</span>
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => p + 1)} disabled={history.length < itemsPerPage}>
                  Next <ChevronRight size={16} className="ml-1"/>
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
