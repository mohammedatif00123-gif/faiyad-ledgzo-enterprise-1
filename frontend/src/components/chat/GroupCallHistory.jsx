import React, { useEffect, useState } from 'react';
import { Phone, Video, PhoneIncoming, PhoneOutgoing, PhoneMissed, Clock } from 'lucide-react';
import api from '../../services/api';
import { format } from 'date-fns';

export function GroupCallHistory({ conversationId }) {
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/calls/history`) // In a real scenario we might want a specific endpoint or filter by conversationId
      .then(res => {
        // Filter calls for this conversation locally if there is no query param for it
        const filtered = (res.data.data || []).filter(c => c.conversation === conversationId);
        setCalls(filtered);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [conversationId]);

  const formatDuration = (secs) => {
    if (!secs) return '0s';
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  const getCallIcon = (call) => {
    if (call.status === 'Missed') return <PhoneMissed className="w-4 h-4 text-red-500" />;
    if (call.callType === 'video') return <Video className="w-4 h-4 text-primary" />;
    return <Phone className="w-4 h-4 text-primary" />;
  };

  if (loading) return <div className="p-4 text-center text-sm text-muted-foreground">Loading call history...</div>;

  if (calls.length === 0) return (
    <div className="p-8 flex flex-col items-center justify-center text-center">
      <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-3">
        <Phone className="w-6 h-6 text-muted-foreground" />
      </div>
      <p className="text-sm font-medium">No calls yet</p>
      <p className="text-xs text-muted-foreground mt-1">Group calls will appear here</p>
    </div>
  );

  return (
    <div className="flex flex-col gap-2 p-2">
      {calls.map((call) => (
        <div key={call._id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 border border-transparent hover:border-border transition-colors">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            {getCallIcon(call)}
          </div>
          
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {call.callType === 'video' ? 'Video Call' : 'Voice Call'}
            </p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
              <span>{format(new Date(call.createdAt), 'MMM d, h:mm a')}</span>
              {call.duration > 0 && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDuration(call.duration)}
                  </span>
                </>
              )}
            </div>
          </div>
          
          <div className="text-xs font-medium px-2 py-1 rounded-full bg-muted">
            {call.status}
          </div>
        </div>
      ))}
    </div>
  );
}
