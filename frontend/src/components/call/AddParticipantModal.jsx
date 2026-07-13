import React, { useEffect, useState } from 'react';
import { X, Search, PhoneForwarded } from 'lucide-react';
import api from '../../services/api';
import { getAvatarUrl } from '../../utils/avatar';

export function AddParticipantModal({ onClose, activeCall, onInvite }) {
  const [directory, setDirectory] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get('/chat/directory')
      .then(res => {
        // Filter out existing participants
        const existingIds = activeCall.participants.map(p => p._id || p);
        const available = res.data.data.filter(u => !existingIds.includes(u._id) && u.status !== 'In Call');
        setDirectory(available);
      })
      .catch(console.error);
  }, [activeCall]);

  const filtered = directory.filter(u => 
    (u.firstName + ' ' + u.lastName).toLowerCase().includes(search.toLowerCase()) ||
    u.role.toLowerCase().includes(search.toLowerCase())
  );

  const handleInvite = async (userId) => {
    setLoading(true);
    try {
      await api.post(`/calls/${activeCall.callId}/invite`, { userId });
      onInvite(userId);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-card w-full max-w-sm rounded-lg shadow-xl flex flex-col overflow-hidden text-card-foreground border">
        <div className="flex items-center justify-between p-4 border-b bg-muted/30">
          <h3 className="font-semibold text-lg">Add to Call</h3>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-muted text-muted-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-4 border-b relative">
          <Search className="w-4 h-4 absolute left-7 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input 
            type="text" 
            placeholder="Search users..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-muted border-none rounded-md py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>

        <div className="flex-1 max-h-64 overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No available users found
            </div>
          ) : (
            filtered.map(u => (
              <div key={u._id} className="flex items-center justify-between p-2 hover:bg-muted rounded-md transition-colors group">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-primary/10">
                    {u.avatar ? (
                      <img src={getAvatarUrl(u.avatar)} alt="avatar" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-primary font-bold">
                        {u.firstName[0]}
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="font-medium text-sm">{u.firstName} {u.lastName}</div>
                    <div className="text-xs text-muted-foreground">{u.role}</div>
                  </div>
                </div>
                <button 
                  onClick={() => handleInvite(u._id)}
                  disabled={loading}
                  className="p-2 rounded-full bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-50"
                >
                  <PhoneForwarded className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
