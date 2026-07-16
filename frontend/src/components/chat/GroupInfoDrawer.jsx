import React, { useState, useEffect } from 'react';
import { X, Users, Image as ImageIcon, Link as LinkIcon, FileText, Settings, UserPlus, LogOut, Search, MoreVertical, Mic, Pin, BellOff, Bell, Phone } from 'lucide-react';
import { useSelector, useDispatch } from 'react-redux';
import { Avatar } from '../ui/Avatar';
import api from '../../services/api';
import { updateConversation, leaveGroup, removeGroupMember, updateMemberRole, removeConversation, setActiveConversation } from '../../store/slices/chatSlice';
import { GroupCallHistory } from './GroupCallHistory';
import { AddGroupMemberModal } from './AddGroupMemberModal';
import { useE2EE } from '../../context/E2EEContext';
import { exportAESKey, encryptText } from '../../utils/cryptoService';

export function GroupInfoDrawer({ conversation, isOpen, onClose, onSearchClick }) {
  const dispatch = useDispatch();
  const { user } = useSelector(state => state.auth);
  const { messages } = useSelector(state => state.chat);
  const [members, setMembers] = useState([]);
  const [activeTab, setActiveTab] = useState('members'); // members, media, settings, calls
  const [searchQuery, setSearchQuery] = useState('');

  const [showAddMember, setShowAddMember] = useState(false);
  const { isReady: isE2EEReady, getSharedSecret, getGroupKey, cacheGroupKey } = useE2EE();

  const fetchMembers = () => {
    if (conversation) {
      api.get(`/chat/conversations/${conversation._id}/members`).then(res => {
        setMembers(res.data.data || []);
      }).catch(console.error);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchMembers();
    }
  }, [isOpen, conversation]);

  const handleLeaveGroup = async () => {
    try {
      await dispatch(leaveGroup(conversation._id)).unwrap();
      onClose();
    } catch (err) {
      console.error(err);
      alert(err);
    }
  };

  const handleDeleteGroup = async () => {
    if (!window.confirm("Are you sure you want to delete this group? This action cannot be undone.")) return;
    try {
      await api.delete(`/chat/conversations/${conversation._id}`);
      dispatch(removeConversation(conversation._id));
      dispatch(setActiveConversation(null));
      onClose();
    } catch (err) {
      console.error('Failed to delete group:', err);
      alert(err.response?.data?.message || 'Failed to delete group');
    }
  };

  const handleRemoveMember = async (userId) => {
    try {
      await dispatch(removeGroupMember({ conversationId: conversation._id, userId })).unwrap();
      setMembers(prev => prev.filter(m => m.user._id !== userId));
    } catch (err) {
      console.error(err);
      alert(err);
    }
  };

  const handleUpdateRole = async (userId, role) => {
    try {
      await dispatch(updateMemberRole({ conversationId: conversation._id, userId, role })).unwrap();
      setMembers(prev => prev.map(m => m.user._id === userId ? { ...m, role } : m));
    } catch (err) {
      console.error(err);
      alert(err);
    }
  };

  const handleResendKey = async (userId) => {
    try {
      if (!isE2EEReady) throw new Error('E2EE not ready');
      
      let groupKey;
      try {
        groupKey = await getGroupKey(conversation._id);
        if (!groupKey) throw new Error('No key');
      } catch (e) {
        throw new Error('Cannot resend: You do not possess the current group key.');
      }
      
      const jwk = await exportAESKey(groupKey);
      const jwkString = JSON.stringify(jwk);
      
      const sharedSecret = await getSharedSecret(userId);
      if (!sharedSecret) throw new Error('Could not get shared secret with user');
      
      const encrypted = await encryptText(sharedSecret, jwkString);
      
      await api.put(`/chat/conversations/${conversation._id}/members/${userId}/key`, {
        encryptedKey: encrypted
      });
      
      alert('Group key resent successfully!');
    } catch (error) {
      console.error('Failed to resend key:', error);
      alert(error.message || 'Failed to resend key');
    }
  };

  const handleReEncryptForAll = async () => {
    try {
      if (!isE2EEReady) throw new Error('E2EE not ready');
      
      const confirmReencrypt = window.confirm('Are you sure you want to re-encrypt the group key for all members? Use this if some members cannot decrypt messages.');
      if (!confirmReencrypt) return;

      let groupKey;
      try {
        groupKey = await getGroupKey(conversation._id);
        if (!groupKey) throw new Error('No key');
      } catch (e) {
        throw new Error('Cannot re-encrypt: You do not possess the current group key. If it is permanently lost, you must generate a new master key.');
      }
      
      const jwk = await exportAESKey(groupKey);
      const jwkString = JSON.stringify(jwk);
      
      const encryptedKeys = [];
      const uniqueMembers = new Map();
      
      for (const m of members) {
        const memberId = m.user?._id || m.user?.id || m.user;
        if (!memberId) continue;
        if (!uniqueMembers.has(memberId)) {
          uniqueMembers.set(memberId, m);
        }
      }

      for (const m of uniqueMembers.values()) {
        const memberId = m.user?._id || m.user?.id || m.user;
        const sharedSecret = await getSharedSecret(memberId);
        if (sharedSecret) {
           const encrypted = await encryptText(sharedSecret, jwkString);
           encryptedKeys.push({
             userId: memberId,
             encryptedKey: encrypted
           });
        }
      }
      
      await api.put(`/chat/conversations/${conversation._id}/keys/reencrypt`, {
        keys: encryptedKeys
      });
      
      alert('Group key re-encrypted successfully for all members!');
    } catch (error) {
      console.error(error);
      alert('Failed to re-encrypt: ' + error.message);
    }
  };

  const handleRegenerateMasterKey = async () => {
    try {
      if (!isE2EEReady) throw new Error('E2EE not ready');
      
      const confirmRegen = window.confirm('WARNING: Generating a new master key will permanently lock all past messages for everyone. Only do this if the original key is permanently lost.\n\nAre you sure you want to proceed?');
      if (!confirmRegen) return;

      const { generateAESKey } = await import('../../utils/cryptoService');
      const newGroupKey = await generateAESKey();
      
      if (typeof cacheGroupKey === 'function') {
        cacheGroupKey(conversation._id, newGroupKey);
      }
      
      const jwk = await exportAESKey(newGroupKey);
      const jwkString = JSON.stringify(jwk);
      
      const encryptedKeys = [];
      const uniqueMembers = new Map();
      const newVersion = Date.now(); // Safe versioning timestamp
      
      for (const m of members) {
        const memberId = m.user?._id || m.user?.id || m.user;
        if (!memberId) continue;
        if (!uniqueMembers.has(memberId)) {
          uniqueMembers.set(memberId, m);
        }
      }

      for (const m of uniqueMembers.values()) {
        const memberId = m.user?._id || m.user?.id || m.user;
        const sharedSecret = await getSharedSecret(memberId);
        if (sharedSecret) {
           const encrypted = await encryptText(sharedSecret, jwkString);
           encryptedKeys.push({
             userId: memberId,
             encryptedKey: encrypted
           });
        }
      }
      
      await api.put(`/chat/conversations/${conversation._id}/keys/reencrypt`, {
        keys: encryptedKeys,
        version: newVersion
      });
      
      alert('New Master Group Key generated and broadcasted successfully!');
    } catch (error) {
      console.error(error);
      alert('Failed to regenerate master key: ' + error.message);
    }
  };

  const [activeMenuId, setActiveMenuId] = useState(null);

  const handlePin = async () => {
    try {
      const newPinnedStatus = !conversation.isPinned;
      await api.post(`/chat/conversations/${conversation._id}/pin`, { isPinned: newPinnedStatus });
      dispatch(updateConversation({ _id: conversation._id, isPinned: newPinnedStatus }));
    } catch (err) {
      console.error(err);
    }
  };

  const handleMute = async () => {
    try {
      const newMutedStatus = !conversation.isMuted;
      await api.post(`/chat/conversations/${conversation._id}/mute`, { durationHours: newMutedStatus ? -1 : 0 });
      dispatch(updateConversation({ _id: conversation._id, isMuted: newMutedStatus }));
    } catch (err) {
      console.error(err);
    }
  };

  const filteredMembers = members.filter(m => {
    if (!m.user) return false;
    const fullName = `${m.user.firstName || ''} ${m.user.lastName || ''}`.toLowerCase();
    return fullName.includes(searchQuery.toLowerCase());
  });

  const userId = user?.id || user?._id;
  
  const currentUserRole = members.find(m => m.user?._id === userId)?.role || 'member';

  const isDirect = conversation?.type === 'direct';
  const otherMember = isDirect ? members.find(m => m.user?._id !== userId)?.user : null;
  const isPinned = conversation?.isPinned;
  const isMuted = conversation?.isMuted;

  const currentMessages = messages[conversation?._id] || [];
  
  // Extract all attachments from current messages
  const allMedia = currentMessages.flatMap(m => m.attachments || []);
  const images = allMedia.filter(a => a.fileType === 'image');
  const docs = allMedia.filter(a => ['pdf', 'document'].includes(a.fileType));
  const audio = allMedia.filter(a => a.fileType === 'audio' || a.fileType === 'voice');
  const links = []; // we don't extract links from text yet, just placeholder

  return (
    <div className={`absolute top-0 bottom-0 right-0 w-80 bg-background border-l shadow-2xl transform transition-transform duration-300 z-[60] flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
      
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-muted/30">
        <h2 className="font-bold">{isDirect ? 'Contact Info' : 'Group Info'}</h2>
        <button onClick={onClose} className="p-1 hover:bg-muted rounded-full">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Profile Section */}
      <div className="flex flex-col items-center p-6 border-b">
        <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mb-4 overflow-hidden border">
          {isDirect ? (
            otherMember?.profileImage ? (
              <img src={otherMember.profileImage} alt="avatar" className="w-full h-full object-cover" />
            ) : (
              <span className="text-3xl font-bold text-primary uppercase">
                {otherMember?.firstName?.[0]}{otherMember?.lastName?.[0]}
              </span>
            )
          ) : conversation?.avatar ? (
            <img src={conversation.avatar} alt="avatar" className="w-full h-full object-cover" />
          ) : (
            <Users className="w-10 h-10 text-primary" />
          )}
        </div>
        <h3 className="text-xl font-bold text-center">
          {isDirect ? `${otherMember?.firstName || ''} ${otherMember?.lastName || ''}` : conversation?.name}
        </h3>
        {!isDirect && conversation?.description && (
          <p className="text-sm text-muted-foreground text-center mt-2">{conversation.description}</p>
        )}
        <p className="text-xs text-muted-foreground mt-2">
          {isDirect ? otherMember?.companyEmail : `Group • ${conversation?.memberCount || members.length} members`}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
        {/* Common Actions */}
        <div className="space-y-1 p-2 border-b">
          <button onClick={onSearchClick} className="w-full flex items-center p-3 rounded-md hover:bg-muted transition-colors text-sm font-medium">
            <Search className="w-5 h-5 text-muted-foreground mr-3" /> Search Conversation
          </button>
          
          <button onClick={handlePin} className="w-full flex items-center p-3 rounded-md hover:bg-muted transition-colors text-sm font-medium">
            <Pin className={`w-5 h-5 mr-3 ${isPinned ? 'text-primary fill-primary/20' : 'text-muted-foreground'}`} /> 
            {isPinned ? 'Unpin Conversation' : 'Pin Conversation'}
          </button>
          
          <button onClick={handleMute} className="w-full flex items-center p-3 rounded-md hover:bg-muted transition-colors text-sm font-medium">
            {isMuted ? <Bell className="w-5 h-5 text-muted-foreground mr-3" /> : <BellOff className="w-5 h-5 text-muted-foreground mr-3" />}
            {isMuted ? 'Unmute Notifications' : 'Mute Notifications'}
          </button>
        </div>

        {isDirect ? (
          <div className="p-4 space-y-4">
             <div>
                <h4 className="text-xs font-bold text-muted-foreground uppercase mb-3">Media, Links & Docs</h4>
                <div className="flex gap-2 mb-2 overflow-x-auto pb-2 scrollbar-hide">
                  {images.slice(0, 4).map(img => (
                    <img key={img._id} src={import.meta.env.VITE_API_URL + img.fileUrl} className="w-16 h-16 object-cover rounded-md flex-shrink-0 border" />
                  ))}
                  {images.length === 0 && <span className="text-sm text-muted-foreground italic">No media shared</span>}
                </div>
                {images.length > 0 && <button className="text-sm text-primary font-medium">View All Media ({allMedia.length})</button>}
             </div>
          </div>
        ) : (
          <>
            {/* Tabs */}
            <div className="flex border-b text-sm font-medium mx-2">
              <button 
                onClick={() => setActiveTab('members')} 
                className={`flex-1 py-3 text-center border-b-2 transition-colors ${activeTab === 'members' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
              >
                Members
              </button>
              <button 
                onClick={() => setActiveTab('media')} 
                className={`flex-1 py-3 text-center border-b-2 transition-colors ${activeTab === 'media' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
              >
                Media
              </button>
              <button 
                onClick={() => setActiveTab('settings')} 
                className={`flex-1 py-3 text-center border-b-2 transition-colors ${activeTab === 'settings' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
              >
                Settings
              </button>
              <button 
                onClick={() => setActiveTab('calls')} 
                className={`flex-1 py-3 text-center border-b-2 transition-colors ${activeTab === 'calls' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
              >
                Calls
              </button>
            </div>

            <div className="p-2">
              {activeTab === 'members' && (
                <div className="flex flex-col h-full">
                  <div className="relative mb-4 mt-2 px-2">
                    <Search className="absolute left-4 top-2.5 w-4 h-4 text-muted-foreground" />
                    <input 
                      type="text" 
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      placeholder="Search members..." 
                      className="w-full pl-9 p-2 border rounded-md outline-none text-sm bg-muted/30 focus:bg-background focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  {['owner', 'admin'].includes(currentUserRole) && (
                    <button 
                      onClick={() => setShowAddMember(true)}
                      className="flex items-center gap-3 p-3 mx-2 mb-2 rounded-md bg-primary/5 text-primary hover:bg-primary/10 transition-colors text-sm font-medium"
                    >
                      <UserPlus className="w-5 h-5" />
                      Add Members
                    </button>
                  )}

                  <div className="space-y-1">
                    {filteredMembers.map(m => (
                      <div key={m._id} className="flex items-center justify-between p-2 mx-1 hover:bg-muted/50 rounded-md group">
                        <div className="flex items-center gap-3">
                          <Avatar src={m.user?.avatar} fallback={m.user?.firstName?.[0]} className="w-8 h-8" />
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">
                              {m.user?._id === userId ? 'You' : `${m.user?.firstName} ${m.user?.lastName}`}
                            </span>
                            <span className="text-[10px] text-muted-foreground capitalize">{m.role}</span>
                          </div>
                        </div>
                        
                        {['owner', 'admin'].includes(currentUserRole) && m.user?._id !== userId && (
                          <div className="relative">
                            <button 
                              onClick={() => setActiveMenuId(activeMenuId === m.user._id ? null : m.user._id)}
                              className="p-1 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-foreground transition-all focus:opacity-100"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>
                            
                            {activeMenuId === m.user._id && (
                              <div className="absolute right-0 top-6 w-36 bg-[var(--ent-surface)] border border-[var(--ent-border)] rounded-md shadow-lg z-50 overflow-hidden">
                                {m.role !== 'admin' && (
                                  <button onClick={() => { handleUpdateRole(m.user._id, 'admin'); setActiveMenuId(null); }} className="w-full text-left px-4 py-2 text-sm hover:bg-[var(--ent-primary)]/10">Make Admin</button>
                                )}
                                {m.role === 'admin' && currentUserRole === 'owner' && (
                                  <button onClick={() => { handleUpdateRole(m.user._id, 'member'); setActiveMenuId(null); }} className="w-full text-left px-4 py-2 text-sm hover:bg-[var(--ent-primary)]/10">Remove Admin</button>
                                )}
                                <button onClick={() => { handleResendKey(m.user._id); setActiveMenuId(null); }} className="w-full text-left px-4 py-2 text-sm hover:bg-[var(--ent-primary)]/10">Resend Encryption Key</button>
                                <button onClick={() => { handleRemoveMember(m.user._id); setActiveMenuId(null); }} className="w-full text-left px-4 py-2 text-sm text-[var(--ent-danger)] hover:bg-[var(--ent-danger)]/10">Remove User</button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'media' && (
                <div className="p-2 space-y-4">
                  <div className="grid grid-cols-4 gap-2">
                    {images.map(img => (
                      <img key={img._id} src={import.meta.env.VITE_API_URL + img.fileUrl} className="w-full aspect-square object-cover rounded border" />
                    ))}
                    {images.length === 0 && <span className="col-span-4 text-sm text-muted-foreground italic mt-2">No media shared</span>}
                  </div>
                </div>
              )}

              {activeTab === 'settings' && (
                <div className="space-y-4 p-2">
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-muted-foreground uppercase">Permissions</h4>
                    <label className="flex items-center justify-between text-sm cursor-pointer p-2 hover:bg-muted/30 rounded">
                      <span>Admins Only Send</span>
                      <input type="checkbox" disabled={!['owner', 'admin'].includes(currentUserRole)} checked={conversation?.permissionsMatrix?.adminsOnlySend} className="accent-primary" />
                    </label>
                    <label className="flex items-center justify-between text-sm cursor-pointer p-2 hover:bg-muted/30 rounded">
                      <span>Admins Only Edit Info</span>
                      <input type="checkbox" disabled={!['owner', 'admin'].includes(currentUserRole)} checked={conversation?.permissionsMatrix?.adminsOnlyEditInfo} className="accent-primary" />
                    </label>
                  </div>
                  
                  <div className="space-y-2 pt-4 border-t">
                    <h4 className="text-xs font-bold text-muted-foreground uppercase">Invite Links</h4>
                    <button disabled={!['owner', 'admin'].includes(currentUserRole)} className="w-full text-left text-sm p-2 text-primary hover:bg-muted/30 rounded font-medium">
                      Generate Invite Link
                    </button>
                  </div>
                  
                  {['owner', 'admin'].includes(currentUserRole) && (
                    <div className="space-y-2 pt-4 border-t">
                      <h4 className="text-xs font-bold text-muted-foreground uppercase">Security</h4>
                      <button 
                        onClick={handleReEncryptForAll}
                        className="w-full text-left text-sm p-2 text-primary hover:bg-muted/30 rounded font-medium flex items-center justify-between"
                      >
                        Re-encrypt Group Key for All Members
                      </button>
                      <p className="text-xs text-muted-foreground px-2">Use this if members are seeing "Decryption Failed" errors after getting a new device.</p>
                      
                      <button 
                        onClick={handleRegenerateMasterKey}
                        className="w-full text-left text-sm p-2 text-red-500 hover:bg-red-500/10 rounded font-medium flex items-center justify-between mt-2"
                      >
                        Regenerate Master Key (Destructive)
                      </button>
                      <p className="text-xs text-red-400/80 px-2">Emergency only. Generates a new key version. Locks all past messages permanently.</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'calls' && (
                <div className="flex flex-col h-full overflow-y-auto custom-scrollbar pb-20">
                  <GroupCallHistory conversationId={conversation._id} />
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {showAddMember && (
        <AddGroupMemberModal
          conversationId={conversation._id}
          currentMembers={members}
          onClose={() => setShowAddMember(false)}
          onMembersAdded={fetchMembers}
        />
      )}

      {!isDirect && (
        <div className="p-4 border-t space-y-2">
          {['owner', 'admin'].includes(currentUserRole) && (
            <button onClick={handleDeleteGroup} className="w-full flex items-center justify-center gap-2 text-destructive border border-destructive/30 hover:bg-destructive/10 p-2 rounded-md text-sm font-bold transition-colors">
              <LogOut className="w-4 h-4" /> Delete Group
            </button>
          )}
          <button onClick={handleLeaveGroup} className="w-full flex items-center justify-center gap-2 text-destructive hover:bg-destructive/10 p-2 rounded-md text-sm font-bold transition-colors">
            <LogOut className="w-4 h-4" /> Leave Group
          </button>
        </div>
      )}

    </div>
  );
}
