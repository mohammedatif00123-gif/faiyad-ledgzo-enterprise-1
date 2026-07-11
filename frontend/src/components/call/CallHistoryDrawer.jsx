import React, { useState, useEffect } from 'react';
import { X, Search, Phone, PhoneIncoming, PhoneOutgoing, PhoneMissed, PhoneOff } from 'lucide-react';
import { format } from 'date-fns';
import api from '../../services/api';

export function CallHistoryDrawer({ isOpen, onClose }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchHistory();
    }
  }, [isOpen]);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const res = await api.get('/calls/history');
      setHistory(res.data.data.history || []);
    } catch (err) {
      console.error('Failed to fetch call history', err);
    } finally {
      setLoading(false);
    }
  };

  const getIcon = (type, status) => {
    if (status === 'Missed') return <PhoneMissed className="w-5 h-5 text-red-500" />;
    if (status === 'Rejected') return <PhoneOff className="w-5 h-5 text-red-500" />;
    if (type === 'incoming') return <PhoneIncoming className="w-5 h-5 text-blue-500" />;
    return <PhoneOutgoing className="w-5 h-5 text-green-500" />;
  };

  const formatDuration = (secs) => {
    if (!secs) return '';
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}m ${s}s`;
  };

  if (!isOpen) return null;

  return (
    <div className="absolute inset-y-0 right-0 w-full sm:w-96 bg-background border-l border-border shadow-2xl flex flex-col z-40 transform transition-transform duration-300 translate-x-0">
      <div className="flex items-center justify-between p-4 border-b border-border bg-card">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Phone className="w-5 h-5" /> Call History
        </h2>
        <button onClick={onClose} className="p-2 hover:bg-muted rounded-full">
          <X className="w-5 h-5 text-muted-foreground" />
        </button>
      </div>

      <div className="p-4 border-b border-border space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input 
            type="text" 
            placeholder="Search name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-muted border-none rounded-lg text-sm focus:ring-1 focus:ring-primary outline-none"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
          {['All', 'Incoming', 'Outgoing', 'Missed', 'Rejected'].map(f => (
            <button 
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition-colors ${filter === f ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {loading ? (
          <div className="flex justify-center p-8"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
        ) : history.length === 0 ? (
          <div className="text-center p-8 text-muted-foreground text-sm">No call history found</div>
        ) : (
          <div className="space-y-1">
            {history.map(call => {
              // Note: Need current user ID to determine incoming/outgoing accurately
              // Placeholder logic
              const isOutgoing = true; // replace with actual check
              
              return (
                <div key={call._id} className="flex items-center gap-4 p-3 hover:bg-muted/50 rounded-xl transition-colors cursor-pointer">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                    {getIcon(isOutgoing ? 'outgoing' : 'incoming', call.status)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-0.5">
                      <h4 className="font-medium text-sm truncate">User Name</h4>
                      <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                        {format(new Date(call.createdAt), 'MMM d, h:mm a')}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{call.status}</span>
                      {call.duration > 0 && <span>{formatDuration(call.duration)}</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
