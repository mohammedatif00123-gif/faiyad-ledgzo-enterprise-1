import React, { useState, useEffect } from 'react';
import { X, Search, Phone, Video } from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';
import { useSelector } from 'react-redux';
import api from '../../services/api';

export function CallHistoryDrawer({ isOpen, onClose }) {
  const { user } = useSelector(state => state.auth);
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

  const getCallType = (call) => {
    const isInitiator = call.initiatedBy?._id === user.id;
    if (['Missed', 'Rejected'].includes(call.status) && !isInitiator) {
      return 'Missed';
    }
    if (isInitiator) {
      return 'Outgoing';
    }
    return 'Incoming';
  };

  const getIcon = (type, callTypeLabel) => {
    if (type === 'Missed') return <span className="text-sm">🔴</span>;
    if (type === 'Incoming') return <span className="text-sm">⬇️</span>;
    return <span className="text-sm">⬆️</span>;
  };

  const formatDuration = (secs) => {
    if (!secs) return '0s';
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    if (m === 0) return `${s}s`;
    return `${m}m ${s}s`;
  };

  if (!isOpen) return null;

  // Filter and group history
  const filteredHistory = history.filter(call => {
    if (filter === 'Missed' && !['Missed', 'Rejected'].includes(call.status)) return false;
    
    if (search) {
      const otherParties = call.participants.filter(p => p._id !== user.id);
      const names = otherParties.map(p => `${p.firstName} ${p.lastName}`).join(' ').toLowerCase();
      if (!names.includes(search.toLowerCase())) return false;
    }
    return true;
  });

  const groupedHistory = {
    Today: [],
    Yesterday: [],
    Older: []
  };

  filteredHistory.forEach(call => {
    const date = new Date(call.createdAt);
    if (isToday(date)) {
      groupedHistory.Today.push(call);
    } else if (isYesterday(date)) {
      groupedHistory.Yesterday.push(call);
    } else {
      groupedHistory.Older.push(call);
    }
  });

  const renderSection = (title, calls) => {
    if (calls.length === 0) return null;

    return (
      <div className="mb-6">
        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 px-2">{title}</h3>
        <div className="space-y-1">
          {calls.map(call => {
            const type = getCallType(call);
            const otherParties = call.participants.filter(p => p._id !== user.id);
            const contactName = otherParties.length === 1 
              ? `${otherParties[0].firstName} ${otherParties[0].lastName}`
              : otherParties.length > 1 
                ? `${otherParties[0].firstName} and ${otherParties.length - 1} others`
                : 'Unknown';

            return (
              <div key={call._id} className="flex items-center gap-4 p-3 hover:bg-muted/50 rounded-xl transition-colors cursor-pointer">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0 border relative">
                  {otherParties[0]?.avatar ? (
                    <img src={otherParties[0].avatar} className="w-full h-full rounded-full object-cover" alt="" />
                  ) : (
                    <span className="font-semibold text-muted-foreground">
                      {otherParties[0]?.firstName?.[0] || '?'}
                    </span>
                  )}
                  <div className="absolute -bottom-1 -right-1 bg-background rounded-full p-0.5 border shadow-sm flex items-center justify-center w-5 h-5">
                    {getIcon(type, call.callType)}
                  </div>
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-0.5">
                    <h4 className={`font-semibold text-sm truncate ${type === 'Missed' ? 'text-red-500' : ''}`}>
                      {contactName}
                    </h4>
                    <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                      {format(new Date(call.createdAt), 'h:mm a')}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      {call.callType === 'video' ? <Video className="w-3 h-3" /> : <Phone className="w-3 h-3" />}
                      {type}
                    </span>
                    {call.duration > 0 && <span>{formatDuration(call.duration)}</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="absolute inset-y-0 right-0 w-full sm:w-96 bg-background border-l border-border shadow-2xl flex flex-col z-40 transform transition-transform duration-300 translate-x-0">
      <div className="flex items-center justify-between p-4 border-b border-border bg-card">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <Phone className="w-5 h-5 text-primary" /> Call History
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
            placeholder="Search calls..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-muted border-none rounded-lg text-sm focus:ring-1 focus:ring-primary outline-none"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
          {['All', 'Missed'].map(f => (
            <button 
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 text-xs font-semibold rounded-full whitespace-nowrap transition-colors ${filter === f ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        {loading ? (
          <div className="flex justify-center p-8"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
        ) : filteredHistory.length === 0 ? (
          <div className="text-center p-8 text-muted-foreground text-sm">No call history found</div>
        ) : (
          <div>
            {renderSection('Today', groupedHistory.Today)}
            {renderSection('Yesterday', groupedHistory.Yesterday)}
            {renderSection('Older', groupedHistory.Older)}
          </div>
        )}
      </div>
    </div>
  );
}
