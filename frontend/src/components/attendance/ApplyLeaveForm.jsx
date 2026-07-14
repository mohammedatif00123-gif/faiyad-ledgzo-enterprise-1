import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDispatch, useSelector } from 'react-redux';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { X, Calendar } from 'lucide-react';
import { applyLeave } from '../../store/slices/leaveSlice';
import { toast } from 'sonner';

export default function ApplyLeaveForm({ isOpen, onClose }) {
  const dispatch = useDispatch();
  const { loading } = useSelector((state) => state.leaves);
  
  const [formData, setFormData] = useState({
    type: 'annual',
    fromDate: '',
    toDate: '',
    reason: ''
  });

  const calculateDays = (start, end) => {
    if (!start || !end) return 0;
    const s = new Date(start);
    const e = new Date(end);
    const diff = Math.ceil((e - s) / (1000 * 60 * 60 * 24)) + 1;
    return diff > 0 ? diff : 0;
  };

  const totalDays = calculateDays(formData.fromDate, formData.toDate);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (totalDays <= 0) {
      toast.error('Invalid date range');
      return;
    }
    
    try {
      await dispatch(applyLeave({ ...formData, totalDays })).unwrap();
      toast.success('Leave applied successfully');
      onClose();
    } catch (err) {
      toast.error(err || 'Failed to apply leave');
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-card w-full max-w-lg rounded-2xl shadow-xl border overflow-hidden"
        >
          <div className="flex justify-between items-center p-6 border-b bg-muted/30">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Calendar className="text-primary" /> Apply Leave
            </h2>
            <button onClick={onClose} className="p-2 hover:bg-secondary rounded-full transition-colors">
              <X size={20} className="text-muted-foreground" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Leave Type</label>
              <select 
                className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={formData.type}
                onChange={(e) => setFormData({...formData, type: e.target.value})}
              >
                <option value="annual">Annual Leave</option>
                <option value="sick">Sick Leave</option>
                <option value="casual">Casual Leave</option>
                <option value="emergency">Emergency Leave</option>
                <option value="unpaid">Unpaid Leave</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">From Date</label>
                <Input 
                  type="date" 
                  required 
                  value={formData.fromDate}
                  onChange={(e) => setFormData({...formData, fromDate: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">To Date</label>
                <Input 
                  type="date" 
                  required 
                  value={formData.toDate}
                  min={formData.fromDate}
                  onChange={(e) => setFormData({...formData, toDate: e.target.value})}
                />
              </div>
            </div>

            <div className="bg-secondary/50 p-3 rounded-lg border flex justify-between items-center">
              <span className="text-sm font-medium">Total Days:</span>
              <span className="text-lg font-bold text-primary">{totalDays}</span>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Reason</label>
              <textarea 
                className="w-full flex min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Brief reason for your leave..."
                required
                value={formData.reason}
                onChange={(e) => setFormData({...formData, reason: e.target.value})}
              ></textarea>
            </div>

            <div className="pt-4 flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={loading || totalDays <= 0}>
                {loading ? 'Applying...' : 'Apply Leave'}
              </Button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
