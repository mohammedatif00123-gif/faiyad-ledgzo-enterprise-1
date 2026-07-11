import React, { useState, useEffect } from 'react';
import { X, Users, Image as ImageIcon, Link as LinkIcon, FileText, Settings, UserPlus, LogOut, Search, MoreVertical, Mic } from 'lucide-react';
import { useSelector } from 'react-redux';
import { Avatar } from '../ui/Avatar';
import api from '../../services/api';


export function GroupInfoDrawer({ conversation, isOpen, onClose }) {
  const { user } = useSelector(state => state.auth);
  const [members, setMembers] = useState([]);
  const [activeTab, setActiveTab] = useState('members'); // members, media, settings
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (isOpen && conversation) {
      // Fetch rich members list
      api.get(`/chat/conversations/${conversation._id}/members`).then(res => {
        setMembers(res.data.data || []);
      }).catch(console.error);
    }
  }, [isOpen, conversation]);

  const handleLeaveGroup = async () => {
    try {
      await api.post(`/groups/${conversation._id}/leave`);
      onClose();
      // Redux slice should handle the removal or UI re-route
    } catch (err) {
      console.error(err);
    }
  };

  const filteredMembers = members.filter(m => {
    const fullName = `${m.user?.firstName || ''} ${m.user?.lastName || ''}`.toLowerCase();
    return fullName.includes(searchQuery.toLowerCase());
  });

  const currentUserRole = members.find(m => m.user?._id === user.id)?.role || 'member';

  return (
    <div className={`absolute top-0 bottom-0 right-0 w-80 bg-background border-l shadow-2xl transform transition-transform duration-300 z-40 flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
      
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-muted/30">
        <h2 className="font-bold">Group Info</h2>
        <button onClick={onClose} className="p-1 hover:bg-muted rounded-full">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Profile Section */}
      <div className="flex flex-col items-center p-6 border-b">
        <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mb-4 overflow-hidden border">
          {conversation?.avatar ? (
            <img src={conversation.avatar} alt="avatar" className="w-full h-full object-cover" />
          ) : (
            <Users className="w-10 h-10 text-primary" />
          )}
        </div>
        <h3 className="text-xl font-bold text-center">{conversation?.name}</h3>
        {conversation?.description && (
          <p className="text-sm text-muted-foreground text-center mt-2">{conversation.description}</p>
        )}
        <p className="text-xs text-muted-foreground mt-2">Group • {conversation?.memberCount || members.length} members</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b text-sm font-medium">
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
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
        
        {activeTab === 'members' && (
          <div className="flex flex-col h-full">
            <div className="relative mb-4">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
              <input 
                type="text" 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search members..." 
                className="w-full pl-9 p-2 border rounded-md outline-none text-sm bg-muted/30 focus:bg-background focus:ring-2 focus:ring-primary"
              />
            </div>

            {['owner', 'admin'].includes(currentUserRole) && (
              <button className="flex items-center gap-3 p-3 mb-2 rounded-md bg-primary/5 text-primary hover:bg-primary/10 transition-colors text-sm font-medium">
                <UserPlus className="w-5 h-5" />
                Add Members
              </button>
            )}

            <div className="flex-1 space-y-1">
              {filteredMembers.map(m => (
                <div key={m._id} className="flex items-center justify-between p-2 hover:bg-muted/50 rounded-md group">
                  <div className="flex items-center gap-3">
                    <Avatar src={m.user?.avatar} fallback={m.user?.firstName?.[0]} className="w-8 h-8" />
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">
                        {m.user?._id === user.id ? 'You' : `${m.user?.firstName} ${m.user?.lastName}`}
                      </span>
                      <span className="text-[10px] text-muted-foreground capitalize">{m.role}</span>
                    </div>
                  </div>
                  
                  {['owner', 'admin'].includes(currentUserRole) && m.user?._id !== user.id && (
                    <button className="p-1 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-foreground transition-all">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'media' && (
          <div className="grid grid-cols-3 gap-2">
            <div className="aspect-square bg-muted rounded-md flex items-center justify-center flex-col text-muted-foreground hover:bg-muted/80 cursor-pointer">
              <ImageIcon className="w-6 h-6 mb-1" />
              <span className="text-[10px]">Images</span>
            </div>
            <div className="aspect-square bg-muted rounded-md flex items-center justify-center flex-col text-muted-foreground hover:bg-muted/80 cursor-pointer">
              <FileText className="w-6 h-6 mb-1" />
              <span className="text-[10px]">Docs</span>
            </div>
            <div className="aspect-square bg-muted rounded-md flex items-center justify-center flex-col text-muted-foreground hover:bg-muted/80 cursor-pointer">
              <LinkIcon className="w-6 h-6 mb-1" />
              <span className="text-[10px]">Links</span>
            </div>
            <div className="aspect-square bg-muted rounded-md flex items-center justify-center flex-col text-muted-foreground hover:bg-muted/80 cursor-pointer">
              <Mic className="w-6 h-6 mb-1" />
              <span className="text-[10px]">Audio</span>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-4">
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
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="p-4 border-t">
        <button onClick={handleLeaveGroup} className="w-full flex items-center justify-center gap-2 text-destructive hover:bg-destructive/10 p-2 rounded-md text-sm font-bold transition-colors">
          <LogOut className="w-4 h-4" /> Leave Group
        </button>
      </div>

    </div>
  );
}
