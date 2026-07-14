import React, { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { X, UserPlus, Search } from 'lucide-react';
import api from '../../services/api';
import { addGroupMembers } from '../../store/slices/chatSlice';
import { getAvatarUrl } from '../../utils/avatar';
import { useE2EE } from '../../context/E2EEContext';
import { exportAESKey, encryptText } from '../../utils/cryptoService';

export function AddGroupMemberModal({ conversationId, currentMembers, onClose, onMembersAdded }) {
  const dispatch = useDispatch();
  const { isReady: isE2EEReady, getSharedSecret, getGroupKey } = useE2EE();
  
  const [employees, setEmployees] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    api.get('/chat/directory').then(res => {
      const directory = res.data.data || [];
      // Filter out users already in the group
      const currentMemberIds = currentMembers.map(m => m.user._id);
      const available = directory.filter(e => !currentMemberIds.includes(e._id));
      setEmployees(available);
    }).catch(console.error);
  }, [currentMembers]);

  const toggleSelect = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(prev => prev.filter(x => x !== id));
    } else {
      setSelectedIds(prev => [...prev, id]);
    }
  };

  const handleSubmit = async () => {
    if (selectedIds.length === 0) return;
    setIsSubmitting(true);
    try {
      let encryptedKeys = [];
      if (isE2EEReady) {
        try {
          const groupKey = await getGroupKey(conversationId);
          if (groupKey) {
             const jwk = await exportAESKey(groupKey);
             const jwkString = JSON.stringify(jwk);
             
             for (const memberId of selectedIds) {
                const sharedSecret = await getSharedSecret(memberId);
                if (sharedSecret) {
                   const encrypted = await encryptText(sharedSecret, jwkString);
                   encryptedKeys.push({
                     user: memberId,
                     encryptedKey: encrypted
                   });
                }
             }
          }
        } catch (err) {
          console.error('[E2EE] Failed to encrypt group key for new members:', err);
        }
      }

      const res = await dispatch(addGroupMembers({ conversationId, memberIds: selectedIds, encryptedKeys })).unwrap();
      // res is the updated conversation
      if (onMembersAdded) onMembersAdded();
      onClose();
    } catch (err) {
      console.error(err);
      alert(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filtered = employees.filter(e => 
    `${e.firstName} ${e.lastName}`.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4">
      <div className="bg-[var(--ent-surface)] border border-[var(--ent-border)] rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[85vh]">
        
        <div className="flex items-center justify-between p-4 border-b border-[var(--ent-border)] bg-[var(--ent-background)]">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-primary" /> 
            Add Members
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
              placeholder="Search directory..." 
              className="w-full pl-9 p-2 border rounded-md outline-none text-sm bg-muted/30 focus:bg-background focus:ring-2 focus:ring-primary"
            />
          </div>
          <div className="mt-3">
            <span className="text-sm text-muted-foreground">{selectedIds.length} selected</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
          {employees.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">No available users to add.</div>
          ) : filtered.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">No users found.</div>
          ) : (
            <div className="space-y-1">
              {filtered.map(user => {
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
                        <span className="text-xs text-muted-foreground">{user.department || user.role}</span>
                      </div>
                    </div>
                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${isSelected ? 'bg-primary border-primary text-primary-foreground' : 'border-muted-foreground group-hover:border-primary'}`}>
                      {isSelected && <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                    </div>
                    <input type="checkbox" className="hidden" checked={isSelected} onChange={() => toggleSelect(user._id)} />
                  </label>
                );
              })}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-[var(--ent-border)] bg-[var(--ent-background)] flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 font-medium hover:bg-muted rounded-md transition-colors">
            Cancel
          </button>
          <button 
            onClick={handleSubmit} 
            disabled={selectedIds.length === 0 || isSubmitting}
            className="px-6 py-2 bg-primary text-primary-foreground rounded-md font-medium disabled:opacity-50 hover:bg-primary/90 transition-colors"
          >
            {isSubmitting ? 'Adding...' : 'Add Members'}
          </button>
        </div>
      </div>
    </div>
  );
}
