import React, { useState, useEffect } from 'react';
import { X, Search, Phone, Video } from 'lucide-react';
import { createPortal } from 'react-dom';
import api from '../../services/api';
import { getAvatarUrl } from '../../utils/avatar';

export function GroupCallInitiateModal({ conversationId, callType, onClose, onStartCall, currentUserId }) {
  const [members, setMembers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    api.get(`/chat/conversations/${conversationId}/members`)
      .then(res => {
        // Filter out current user from member list
        const allMembers = res.data.data || [];
        setMembers(allMembers.filter(m => m.user && m.user._id !== currentUserId));
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [conversationId, currentUserId]);

  const toggleSelect = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(prev => prev.filter(x => x !== id));
    } else {
      setSelectedIds(prev => [...prev, id]);
    }
  };

  const handleSelectAll = () => {
    if (selectedIds.length === members.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(members.map(m => m.user._id));
    }
  };

  const filteredMembers = members.filter(m => {
    const fullName = `${m.user?.firstName || ''} ${m.user?.lastName || ''}`.toLowerCase();
    return fullName.includes(searchQuery.toLowerCase());
  });

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4">
      <div className="bg-[var(--ent-surface)] border border-[var(--ent-border)] rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[85vh]">
        
        <div className="flex items-center justify-between p-4 border-b border-[var(--ent-border)] bg-[var(--ent-background)]">
          <h2 className="text-xl font-bold flex items-center gap-2">
            {callType === 'video' ? <Video className="w-5 h-5 text-primary" /> : <Phone className="w-5 h-5 text-primary" />} 
            Start Group Call
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 border-b border-[var(--ent-border)]">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search members..." 
              className="w-full pl-9 p-2 border rounded-md outline-none text-sm bg-muted/30 focus:bg-background focus:ring-2 focus:ring-primary"
            />
          </div>
          <div className="mt-3 flex justify-between items-center">
            <span className="text-sm text-muted-foreground">{selectedIds.length} selected</span>
            <button onClick={handleSelectAll} className="text-sm text-primary font-medium hover:underline">
              {selectedIds.length === members.length ? 'Deselect All' : 'Select All'}
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
          {isLoading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">Loading members...</div>
          ) : (
            <div className="space-y-1">
              {filteredMembers.map(m => {
                const user = m.user;
                if (!user) return null;
                const isSelected = selectedIds.includes(user._id);

                return (
                  <label key={user._id} className="flex items-center p-2 hover:bg-muted/30 rounded-md cursor-pointer transition-colors group">
                    <div className="flex-1 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 overflow-hidden shrink-0 flex items-center justify-center border">
                        {user.avatar ? (
                          <img src={getAvatarUrl(user.avatar)} alt="avatar" className="w-full h-full object-cover" />
                        ) : (
                          <span className="font-bold text-primary">{user.firstName?.[0]}</span>
                        )}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-medium text-sm text-foreground">
                          {user.firstName} {user.lastName}
                        </span>
                      </div>
                    </div>
                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${isSelected ? 'bg-primary border-primary text-primary-foreground' : 'border-muted-foreground group-hover:border-primary'}`}>
                      {isSelected && <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                    </div>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-[var(--ent-border)] bg-[var(--ent-background)]">
          <button 
            onClick={() => onStartCall(selectedIds)} 
            disabled={selectedIds.length === 0}
            className="w-full py-2.5 bg-primary text-primary-foreground rounded-lg font-medium disabled:opacity-50 hover:bg-primary/90 transition-colors"
          >
            Call {selectedIds.length > 0 ? selectedIds.length : ''} {selectedIds.length === 1 ? 'Person' : 'People'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
