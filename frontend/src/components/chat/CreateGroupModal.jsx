import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { X, Users, Search, Check, UploadCloud, XCircle } from 'lucide-react';
import api from '../../services/api';
import { setConversations } from '../../store/slices/chatSlice';
import { useE2EE } from '../../context/E2EEContext';
import { generateAESKey, exportAESKey, encryptText } from '../../utils/cryptoService';

export function CreateGroupModal({ onClose }) {
  const dispatch = useDispatch();
  const { conversations } = useSelector(state => state.chat);
  const { user } = useSelector(state => state.auth);
  const { isReady: isE2EEReady, getSharedSecret } = useE2EE();
  
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState('private');
  const [employees, setEmployees] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);

  useEffect(() => {
    api.get('/chat/directory').then(res => {
      // Filter out self if needed, but directory might already have self
      const directory = res.data.data || [];
      // we assume chat/directory returns { data: [users...] }
      setEmployees(directory);
    }).catch(console.error);
  }, []);

  const handleAvatarChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setAvatarFile(e.target.files[0]);
      setAvatarPreview(URL.createObjectURL(e.target.files[0]));
    }
  };

  const toggleSelect = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(prev => prev.filter(x => x !== id));
    } else {
      setSelectedIds(prev => [...prev, id]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      let avatarUrl = null;
      if (avatarFile) {
        const formData = new FormData();
        formData.append('files', avatarFile);
        const uploadRes = await api.post('/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        if (uploadRes.data.success && uploadRes.data.data.length > 0) {
          avatarUrl = uploadRes.data.data[0].fileUrl;
        }
      }

      // E2EE: Generate Group Key and encrypt for each member
      let encryptedKeys = [];
      if (isE2EEReady) {
        try {
          const groupKey = await generateAESKey();
          const jwk = await exportAESKey(groupKey);
          const jwkString = JSON.stringify(jwk);

          const currentUserId = user._id || user.id;
          const allMembers = Array.from(new Set([...selectedIds, currentUserId]));
          
          for (const memberId of allMembers) {
             const sharedSecret = await getSharedSecret(memberId);
             if (sharedSecret) {
               const encrypted = await encryptText(sharedSecret, jwkString);
               encryptedKeys.push({
                 user: memberId,
                 encryptedKey: encrypted
               });
             }
          }
        } catch (err) {
          console.error('[E2EE] Group Key generation failed:', err);
        }
      }

      const payload = {
        name,
        description,
        visibility,
        members: selectedIds,
        avatar: avatarUrl,
        encryptedKeys
      };

      const res = await api.post('/chat/channel', payload);
      dispatch(setConversations([res.data.data, ...conversations]));
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filtered = employees.filter(e => 
    e.firstName.toLowerCase().includes(searchQuery.toLowerCase()) || 
    e.lastName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-background rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-bold flex items-center gap-2"><Users className="w-5 h-5 text-primary" /> Create Group</h2>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded-full"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
          <form id="create-group-form" onSubmit={handleSubmit} className="space-y-4">
            
            <div className="flex flex-col items-center justify-center">
              <label className="cursor-pointer group relative">
                <div className="w-24 h-24 rounded-full bg-muted border-2 border-dashed border-muted-foreground/50 flex flex-col items-center justify-center overflow-hidden">
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="Group avatar" className="w-full h-full object-cover" />
                  ) : (
                    <>
                      <UploadCloud className="w-8 h-8 text-muted-foreground mb-1 group-hover:text-primary transition-colors" />
                      <span className="text-[10px] text-muted-foreground font-medium">Upload Photo</span>
                    </>
                  )}
                </div>
                <input type="file" className="hidden" accept="image/*" onChange={handleAvatarChange} />
              </label>
              {avatarPreview && (
                <button type="button" onClick={() => { setAvatarPreview(null); setAvatarFile(null); }} className="mt-2 text-xs text-destructive hover:underline">
                  Remove Photo
                </button>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Group Name <span className="text-destructive">*</span></label>
              <input 
                type="text" 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                required 
                placeholder="e.g. Frontend Team" 
                className="w-full p-2 border rounded-md focus:ring-2 focus:ring-primary focus:border-primary outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Description</label>
              <input 
                type="text" 
                value={description} 
                onChange={(e) => setDescription(e.target.value)} 
                placeholder="What is this group about?" 
                className="w-full p-2 border rounded-md focus:ring-2 focus:ring-primary outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Privacy</label>
              <select 
                value={visibility} 
                onChange={e => setVisibility(e.target.value)}
                className="w-full p-2 border rounded-md outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="private">Private - Invite or Approval required</option>
                <option value="public">Public - Anyone in directory can join</option>
                <option value="invite_only">Invite Only - Strict</option>
              </select>
            </div>

            <div className="pt-2">
              <label className="text-sm font-medium flex items-center justify-between mb-2">
                <span>Select Colleagues ({selectedIds.length} selected)</span>
              </label>
              
              <div className="mt-2 max-h-48 overflow-y-auto border rounded-md custom-scrollbar divide-y bg-muted/10">
                {employees.map(emp => {
                  const isSelected = selectedIds.includes(emp._id);
                  return (
                    <div 
                      key={emp._id} 
                      onClick={() => toggleSelect(emp._id)}
                      className={`flex items-center justify-between p-2 cursor-pointer hover:bg-muted transition-colors ${isSelected ? 'bg-primary/5' : ''}`}
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs">
                          {emp.firstName[0]}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">{emp.firstName} {emp.lastName}</span>
                          <span className="text-[10px] text-muted-foreground">{emp.designation}</span>
                        </div>
                      </div>
                      <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${isSelected ? 'bg-primary border-primary text-primary-foreground' : 'border-muted-foreground'}`}>
                        {isSelected && <Check className="w-3 h-3" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            
          </form>
        </div>
        
        <div className="p-4 border-t flex justify-end gap-2 bg-muted/30">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium hover:bg-muted rounded-md transition-colors">
            Cancel
          </button>
          <button 
            form="create-group-form" 
            type="submit" 
            disabled={isSubmitting || !name.trim()}
            className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center gap-2"
          >
            {isSubmitting ? 'Creating...' : 'Create Group'}
          </button>
        </div>
      </div>
    </div>
  );
}
