import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDispatch, useSelector } from 'react-redux';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Coffee, Monitor, Video, Briefcase, X } from 'lucide-react';
import { useSocket } from '../../context/SocketContext';
import { toast } from 'sonner';

export default function AwayModal({ isOpen, onClose }) {
  const { socket } = useSocket();
  const [reason, setReason] = useState('');
  const [customReason, setCustomReason] = useState('');

  const statuses = [
    { id: 'online', label: 'Available', icon: Monitor, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { id: 'away', label: 'Away from Desk', icon: Coffee, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
    { id: 'in-meeting', label: 'In Meeting', icon: Video, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { id: 'busy', label: 'Busy (DND)', icon: Briefcase, color: 'text-purple-500', bg: 'bg-purple-500/10' }
  ];

  const handleUpdateStatus = () => {
    if (!reason) {
      toast.error("Please select a status");
      return;
    }
    
    const finalReason = reason === 'away' && customReason ? customReason : null;
    
    if (socket) {
      socket.emit('status_update', {
        status: reason,
        reason: finalReason
      });
      toast.success("Status updated");
      onClose();
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
          className="bg-card w-full max-w-md rounded-2xl shadow-xl border overflow-hidden"
        >
          <div className="flex justify-between items-center p-6 border-b">
            <h2 className="text-xl font-semibold">Set Status</h2>
            <button onClick={onClose} className="p-2 hover:bg-secondary rounded-full transition-colors">
              <X size={20} className="text-muted-foreground" />
            </button>
          </div>

          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {statuses.map((s) => {
                const Icon = s.icon;
                const isSelected = reason === s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => setReason(s.id)}
                    className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${
                      isSelected ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-secondary/50'
                    }`}
                  >
                    <div className={`p-3 rounded-full mb-2 ${s.bg} ${s.color}`}>
                      <Icon size={24} />
                    </div>
                    <span className="font-medium text-sm">{s.label}</span>
                  </button>
                );
              })}
            </div>

            {reason === 'away' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-4 space-y-2"
              >
                <label className="text-sm font-medium text-muted-foreground">Custom Reason (Optional)</label>
                <Input
                  placeholder="E.g., Stepped out for coffee"
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                />
              </motion.div>
            )}

            <Button onClick={handleUpdateStatus} className="w-full mt-6" size="lg">
              Update Status
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
