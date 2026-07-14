import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, Filter, Calendar, Search, Paperclip, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Avatar, AvatarFallback, AvatarImage } from '../../components/ui/Avatar';
import { toast } from 'sonner';
import api from '../../services/api';

export default function LeaveApprovals() {
  const [leaves, setLeaves] = useState([]);
  const [activeTab, setActiveTab] = useState('pending');
  const [selectedLeave, setSelectedLeave] = useState(null);
  const [actionModal, setActionModal] = useState({ isOpen: false, type: '', reason: '' });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  
  // Filters
  const [typeFilter, setTypeFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState({ from: '', to: '' });
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const fetchLeaves = async () => {
    try {
      setLoading(true);
      const endpoint = activeTab === 'pending' ? '/admin/leaves/pending' : '/admin/leaves/all';
      const params = {
        page: 1,
        limit: 100, // Fetch all for frontend pagination/filtering or let backend handle it if specified. Prompt says GET /api/admin/leaves/pending?page=1&limit=10.
        status: activeTab === 'history' ? 'all' : 'pending',
        from: dateFilter.from,
        to: dateFilter.to
      };
      const res = await api.get(endpoint, { params });
      
      const data = res.data?.data || res.data;
      setLeaves(Array.isArray(data) ? data : (data.leaves || []));
    } catch (err) {
      toast.error(`Failed to fetch ${activeTab} leaves`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaves();
  }, [activeTab, dateFilter]); // Refetch on tab or date change

  const handleAction = async (type) => {
    if (type === 'reject' && !actionModal.reason.trim()) {
      toast.error('Rejection reason is required');
      return;
    }
    
    try {
      setActionLoading(true);
      if (type === 'approve') {
        await api.put(`/admin/leaves/${selectedLeave._id || selectedLeave.id}/approve`);
      } else {
        await api.put(`/admin/leaves/${selectedLeave._id || selectedLeave.id}/reject`, { reason: actionModal.reason });
      }
      toast.success(`Leave ${type === 'approve' ? 'approved' : 'rejected'} successfully`);
      setActionModal({ isOpen: false, type: '', reason: '' });
      setSelectedLeave(null);
      fetchLeaves();
    } catch (err) {
      toast.error(err.response?.data?.message || `Failed to ${type} leave`);
    } finally {
      setActionLoading(false);
    }
  };

  const openModal = (leave, type) => {
    setSelectedLeave(leave);
    setActionModal({ isOpen: true, type, reason: '' });
  };

  const filteredLeaves = useMemo(() => {
    let result = leaves;
    if (typeFilter !== 'all') {
      result = result.filter(l => l.leaveType === typeFilter || l.type === typeFilter);
    }
    return result;
  }, [leaves, typeFilter]);

  // Pagination logic
  const totalPages = Math.ceil(filteredLeaves.length / itemsPerPage) || 1;
  const currentItems = filteredLeaves.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const leaveTypes = ['Annual Leave', 'Sick Leave', 'Casual Leave', 'Emergency', 'Unpaid'];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Leave Approvals</h1>
          <p className="text-muted-foreground">Manage and track employee leave requests.</p>
        </div>
      </motion.div>

      <Card>
        <div className="flex border-b border-border">
          {['pending', 'history'].map(tab => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); setCurrentPage(1); }}
              className={`px-6 py-3 font-medium text-sm transition-colors border-b-2 capitalize ${
                activeTab === tab ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab} Requests
            </button>
          ))}
        </div>
        
        <div className="p-4 bg-muted/20 border-b flex flex-wrap gap-4 items-center justify-between">
          <div className="flex gap-3">
            <select 
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              value={typeFilter}
              onChange={(e) => { setTypeFilter(e.target.value); setCurrentPage(1); }}
            >
              <option value="all">All Leave Types</option>
              {leaveTypes.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <div className="flex items-center gap-2">
              <Input 
                type="date" 
                className="h-9 w-36" 
                value={dateFilter.from} 
                onChange={(e) => { setDateFilter({...dateFilter, from: e.target.value}); setCurrentPage(1); }}
              />
              <span className="text-muted-foreground">-</span>
              <Input 
                type="date" 
                className="h-9 w-36" 
                value={dateFilter.to} 
                onChange={(e) => { setDateFilter({...dateFilter, to: e.target.value}); setCurrentPage(1); }}
              />
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => {setTypeFilter('all'); setDateFilter({from:'', to:''})}}>
            Reset Filters
          </Button>
        </div>

        <CardContent className="p-0">
          <div className="divide-y min-h-[300px]">
            {loading ? (
              <div className="flex justify-center items-center h-[300px]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : currentItems.length === 0 ? (
              <div className="flex flex-col justify-center items-center h-[300px] text-muted-foreground">
                <Calendar size={48} className="mx-auto mb-4 opacity-20" />
                <p>No {activeTab} leave requests found matching your filters.</p>
              </div>
            ) : (
              currentItems.map((leave, i) => {
                const emp = leave.employeeId || leave.employee;
                const empName = leave.name || leave.employeeName || (emp && `${emp.firstName} ${emp.lastName}`) || 'Unknown';
                const empImage = emp?.profileImage || null;
                const status = (leave.status || 'pending').toLowerCase();
                
                return (
                  <motion.div 
                    key={leave._id || leave.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="p-6 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex flex-col lg:flex-row gap-6 justify-between">
                      
                      <div className="flex gap-4">
                        <Avatar className="h-12 w-12 mt-1">
                          {empImage && <AvatarImage src={empImage} />}
                          <AvatarFallback className="bg-primary/10 text-primary font-bold">
                            {empName.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="space-y-2">
                          <div>
                            <h3 className="font-semibold text-lg flex items-center gap-2">
                              {empName}
                              {activeTab === 'history' && (
                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium uppercase tracking-wider ${
                                  status === 'approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                                }`}>
                                  {status}
                                </span>
                              )}
                            </h3>
                            <p className="text-sm text-muted-foreground">Applied on: {new Date(leave.appliedOn || leave.createdAt).toLocaleDateString()}</p>
                          </div>
                          
                          <div className="flex flex-wrap items-center gap-3 text-sm">
                            <span className="px-2.5 py-1 rounded-md bg-blue-100 text-blue-700 dark:bg-blue-500/20 font-medium">
                              {leave.leaveType || leave.type}
                            </span>
                            <span className="flex items-center text-muted-foreground bg-secondary/50 px-2.5 py-1 rounded-md">
                              <Calendar size={14} className="mr-2 text-primary"/> 
                              {new Date(leave.fromDate || leave.startDate || leave.from).toLocaleDateString()} <span className="mx-2">to</span> {new Date(leave.toDate || leave.endDate || leave.to).toLocaleDateString()}
                              <span className="ml-2 font-bold text-foreground">({leave.totalDays || leave.days} Days)</span>
                            </span>
                          </div>
                          
                          <p className="text-sm mt-2 max-w-xl">
                            <span className="font-medium text-foreground">Reason:</span> <span className="text-muted-foreground">{leave.reason}</span>
                          </p>
                          
                          {leave.attachment && (
                            <div className="flex items-center gap-1 text-sm text-blue-600 cursor-pointer hover:underline mt-1">
                              <Paperclip size={14} /> Attachment
                            </div>
                          )}

                          {status === 'rejected' && leave.rejectionReason && (
                            <p className="text-sm mt-2 text-red-600 bg-red-50 p-2 rounded-md border border-red-100">
                              <span className="font-semibold">Rejection Note:</span> {leave.rejectionReason}
                            </p>
                          )}
                        </div>
                      </div>

                      {activeTab === 'pending' && (
                        <div className="flex lg:flex-col gap-2 shrink-0">
                          <Button onClick={() => openModal(leave, 'approve')} className="w-full bg-emerald-600 hover:bg-emerald-700 gap-2">
                            <Check size={16} /> Approve
                          </Button>
                          <Button onClick={() => openModal(leave, 'reject')} variant="outline" className="w-full border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 gap-2">
                            <X size={16} /> Reject
                          </Button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
          
          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="p-4 border-t flex justify-between items-center bg-muted/10">
              <span className="text-sm text-muted-foreground">
                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredLeaves.length)} of {filteredLeaves.length} entries
              </span>
              <div className="flex gap-1">
                <Button variant="outline" size="icon" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
                  <ChevronLeft size={16} />
                </Button>
                <div className="flex items-center px-4 text-sm font-medium">Page {currentPage} of {totalPages}</div>
                <Button variant="outline" size="icon" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
                  <ChevronRight size={16} />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Modal */}
      <AnimatePresence>
        {actionModal.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card w-full max-w-md rounded-2xl shadow-xl border overflow-hidden p-6 space-y-4"
            >
              <h2 className="text-xl font-semibold flex items-center gap-2">
                {actionModal.type === 'approve' ? <Check className="text-emerald-500" /> : <X className="text-red-500" />}
                {actionModal.type === 'approve' ? 'Approve Leave Request' : 'Reject Leave Request'}
              </h2>
              <p className="text-muted-foreground text-sm">
                You are about to {actionModal.type} <strong>{selectedLeave?.totalDays || selectedLeave?.days} days</strong> of {selectedLeave?.leaveType || selectedLeave?.type} for <strong>{selectedLeave?.name || selectedLeave?.employeeName || (selectedLeave?.employee && selectedLeave?.employee.firstName)}</strong>.
              </p>
              
              {actionModal.type === 'reject' && (
                <div className="space-y-2 mt-4">
                  <label className="text-sm font-medium text-red-600">Rejection Reason <span className="text-red-500">*</span></label>
                  <textarea 
                    className="w-full min-h-[100px] rounded-md border border-red-200 bg-red-50/50 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="Please provide a reason for rejecting this leave request..."
                    value={actionModal.reason}
                    onChange={(e) => setActionModal({ ...actionModal, reason: e.target.value })}
                  />
                </div>
              )}

              <div className="flex justify-end gap-3 mt-6">
                <Button variant="outline" onClick={() => setActionModal({ isOpen: false, type: '', reason: '' })} disabled={actionLoading}>Cancel</Button>
                <Button 
                  disabled={actionLoading}
                  onClick={() => handleAction(actionModal.type)}
                  className={actionModal.type === 'approve' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-red-600 hover:bg-red-700 text-white'}
                >
                  {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : `Confirm ${actionModal.type}`}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
