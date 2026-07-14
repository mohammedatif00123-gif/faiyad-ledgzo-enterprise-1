import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { setActiveConversation, setConversations, removeConversation, updateConversation, leaveGroup } from '../../store/slices/chatSlice';
import { useNavigate } from 'react-router-dom';
import { Hash, User, Plus, Users, MoreVertical, LogOut, Phone, Pin, BellOff, ArrowLeft, Video, Coffee, Briefcase, Calendar } from 'lucide-react';
import { Button } from '../ui/Button';
import { CreateGroupModal } from './CreateGroupModal';
import { CallHistoryDrawer } from '../call/CallHistoryDrawer';
import api from '../../services/api';

export function ChatSidebar({ socket }) {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { conversations, activeConversation, readReceipts, typing: stateTyping, messages } = useSelector(state => state.chat);
  const { user } = useSelector(state => state.auth);
  const [directory, setDirectory] = useState([]);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showCallHistory, setShowCallHistory] = useState(false);
  const [menuOpen, setMenuOpen] = useState(null); // stores conversation ID

  useEffect(() => {
    api.get('/chat/directory')
      .then(res => {
        setDirectory(res.data.data.filter(u => u._id !== user.id));
      })
      .catch(console.error);
  }, [user.id]);

  useEffect(() => {
    if (socket) {
      const handlePresence = (updatedUser) => {
        setDirectory(prev => prev.map(u => u._id === updatedUser.user ? { ...u, status: updatedUser.status, isOnline: updatedUser.status !== 'Offline' } : u));
      };
      socket.on('presence_updated', handlePresence);
      return () => socket.off('presence_updated', handlePresence);
    }
  }, [socket]);

  const getLatestTime = (conv) => {
    const convMessages = messages[conv._id] || [];
    if (convMessages.length > 0) {
      return new Date(convMessages[convMessages.length - 1].createdAt).getTime();
    }
    return new Date(conv.updatedAt || conv.createdAt || 0).getTime();
  };

  const getStatusBadge = (statusStr) => {
    if (!statusStr) return null;
    const s = statusStr.toLowerCase();
    if (s.includes('call') || s.includes('video') || s.includes('screen') || s.includes('meeting')) {
      return (
        <span className="ml-2 flex items-center gap-1 text-[10px] text-blue-600 dark:text-blue-500 bg-blue-500/10 px-1.5 py-0.5 rounded-md border border-blue-500/20 whitespace-nowrap" title="In Meeting">
          <Video className="w-2.5 h-2.5" /> In Meet
        </span>
      );
    }
    if (s.includes('away') || s.includes('break')) {
      return (
        <span className="ml-2 flex items-center gap-1 text-[10px] text-yellow-600 dark:text-yellow-500 bg-yellow-500/10 px-1.5 py-0.5 rounded-md border border-yellow-500/20 whitespace-nowrap" title="Away from Desk">
          <Coffee className="w-2.5 h-2.5" /> Away
        </span>
      );
    }
    if (s.includes('busy')) {
      return (
        <span className="ml-2 flex items-center gap-1 text-[10px] text-purple-600 dark:text-purple-500 bg-purple-500/10 px-1.5 py-0.5 rounded-md border border-purple-500/20 whitespace-nowrap" title="Busy (Do not disturb)">
          <Briefcase className="w-2.5 h-2.5" /> Busy
        </span>
      );
    }
    if (s.includes('leave')) {
      return (
        <span className="ml-2 flex items-center gap-1 text-[10px] text-red-600 dark:text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded-md border border-red-500/20 whitespace-nowrap" title="On Leave Today">
          <Calendar className="w-2.5 h-2.5" /> On Leave
        </span>
      );
    }
    return null;
  };

  const sortedConversations = [...conversations].sort((a, b) => {
    const isAPinned = a.isPinned ? 1 : 0;
    const isBPinned = b.isPinned ? 1 : 0;
    
    if (isAPinned !== isBPinned) {
      return isBPinned - isAPinned; // Pinned comes first
    }
    
    return getLatestTime(b) - getLatestTime(a);
  });

  const channels = sortedConversations.filter(c => c.type === 'channel');
  const directs = sortedConversations.filter(c => c.type === 'direct');

  const handleSelect = (id) => {
    dispatch(setActiveConversation(id));
  };

  const handleStartDirectMessage = async (partnerId) => {
    try {
      const res = await api.post('/chat/direct', { partnerId });
      const newConv = res.data.data;
      
      const exists = conversations.find(c => c._id === newConv._id);
      if (!exists) {
        const convRes = await api.get('/chat/conversations');
        dispatch(setConversations(convRes.data.data));
      }
      dispatch(setActiveConversation(newConv._id));
    } catch (err) {
      console.error(err);
    }
  };

  const handleLeaveGroup = async (e, groupId) => {
    e.stopPropagation();
    try {
      await dispatch(leaveGroup(groupId)).unwrap();
      setMenuOpen(null);
    } catch (err) {
      console.error(err);
      toast.error(err);
    }
  };

  const handlePin = async (e, conv) => {
    e.stopPropagation();
    try {
      const newPinnedStatus = !conv.isPinned;
      await api.post(`/chat/conversations/${conv._id}/pin`, { isPinned: newPinnedStatus });
      dispatch(updateConversation({ _id: conv._id, isPinned: newPinnedStatus }));
      setMenuOpen(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleMute = async (e, conv) => {
    e.stopPropagation();
    try {
      const newMutedStatus = !conv.isMuted;
      await api.post(`/chat/conversations/${conv._id}/mute`, { durationHours: newMutedStatus ? -1 : 0 }); // -1 for Always, 0 to unmute
      dispatch(updateConversation({ _id: conv._id, isMuted: newMutedStatus }));
      setMenuOpen(null);
    } catch (err) {
      console.error(err);
    }
  };

  const renderItem = (conv) => {
    const unread = readReceipts[conv._id] || 0;
    const isActive = activeConversation === conv._id;
    const convTyping = stateTyping[conv._id] || {};
    const typingUsers = Object.keys(convTyping).filter(uid => convTyping[uid] && uid !== user.id);
    
    // Get last message for preview
    const convMessages = messages[conv._id] || [];
    const lastMessage = convMessages.length > 0 ? convMessages[convMessages.length - 1] : null;

    return (
      <div
        key={conv._id}
        onClick={() => handleSelect(conv._id)}
        className={`group w-full flex flex-col items-start justify-center px-3 py-2.5 rounded-lg mb-1 text-[var(--font-sm)] transition-colors cursor-pointer ${isActive ? 'bg-[var(--ent-primary)]/10 text-[var(--ent-primary)] font-medium' : 'hover:bg-[var(--ent-background)] text-[var(--ent-text-secondary)]'}`}
      >
        <div className="w-full flex items-center justify-between">
          <div className="flex items-center truncate">
            <div className="relative">
              {conv.type === 'channel' ? <Hash className="w-4 h-4 mr-2 opacity-70" /> : <User className="w-4 h-4 mr-2 opacity-70" />}
              {conv.type === 'direct' && conv.partnerId && !['In Call', 'In Video Call', 'Screen Sharing'].includes(directory.find(u => u._id === conv.partnerId)?.status) && directory.find(u => u._id === conv.partnerId)?.isOnline && (
                <span className="absolute bottom-0 right-1.5 w-2 h-2 bg-green-500 border border-card rounded-full"></span>
              )}
            </div>
            <span className="truncate font-semibold">{conv.name}</span>
            {conv.type === 'direct' && conv.partnerId && getStatusBadge(directory.find(u => u._id === conv.partnerId)?.status)}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {conv.isMuted && <BellOff className="w-3.5 h-3.5 opacity-50" />}
            {conv.isPinned && <Pin className="w-3.5 h-3.5 opacity-50 fill-current" />}
            {unread > 0 && (
              <span className="bg-primary text-primary-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                {unread}
              </span>
            )}
            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <button 
                onClick={() => setMenuOpen(menuOpen === conv._id ? null : conv._id)}
                className="p-1 rounded-md hover:bg-black/10 dark:hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreVertical className="w-4 h-4" />
              </button>
              {menuOpen === conv._id && (
                <div className="absolute right-0 top-6 w-36 bg-popover border rounded-lg shadow-xl z-50 overflow-hidden text-popover-foreground">
                  <button 
                    onClick={(e) => handlePin(e, conv)}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-muted flex items-center gap-2"
                  >
                    <Pin className="w-3 h-3" /> {conv.isPinned ? 'Unpin Chat' : 'Pin Chat'}
                  </button>
                  <button 
                    onClick={(e) => handleMute(e, conv)}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-muted flex items-center gap-2"
                  >
                    <BellOff className="w-3 h-3" /> {conv.isMuted ? 'Unmute' : 'Mute'}
                  </button>
                  {conv.type === 'channel' && (
                    <button 
                      onClick={(e) => handleLeaveGroup(e, conv._id)}
                      className="w-full text-left px-3 py-2 text-xs hover:bg-muted text-destructive flex items-center gap-2"
                    >
                      <LogOut className="w-3 h-3" /> Leave Group
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Preview Line */}
        <div className="w-full flex items-center mt-1 text-xs opacity-70 pl-6 truncate">
          {typingUsers.length > 0 ? (
            <span className="text-primary italic animate-pulse font-medium">typing...</span>
          ) : lastMessage ? (
            <span className="truncate">
              {lastMessage.sender?._id === user.id ? 'You: ' : ''}
              {lastMessage.messageType === 'voice' ? '🎤 Voice message' : lastMessage.attachments?.length > 0 ? '📎 Attachment' : lastMessage.content}
            </span>
          ) : (
            <span className="truncate italic">No messages yet</span>
          )}
          <span className="ml-auto shrink-0 text-[10px] pl-2">{lastMessage ? formatMessageDate(lastMessage.createdAt) : ''}</span>
        </div>
      </div>
    );
  };

  const formatMessageDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    if (date.toDateString() === today.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const availableColleagues = directory.filter(dUser => {
    return !directs.some(conv => conv.partnerId === dUser._id);
  });

  return (
    <div className="flex flex-col h-full bg-[var(--ent-surface)]" onClick={() => setMenuOpen(null)}>
      <div className="p-4 border-b border-[var(--ent-border)] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="hidden md:flex text-[var(--ent-text-secondary)] hover:text-[var(--ent-primary)] hover:bg-[var(--ent-background)] shrink-0" onClick={() => navigate(user?.role === 'Admin' ? '/admin' : '/employee')} title="Back to Dashboard">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h2 className="font-semibold tracking-tight text-[var(--font-lg)] text-[var(--ent-text-primary)]">Chats</h2>
        </div>
        <Button variant="ghost" size="icon" className="text-[var(--ent-text-secondary)] hover:text-[var(--ent-primary)] hover:bg-[var(--ent-background)]" onClick={() => setShowCallHistory(true)} title="Call History">
          <Phone className="w-5 h-5" />
        </Button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-3 scrollbar-hide">
        <div className="mb-6">
          <div className="flex items-center justify-between px-2 mb-2">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Channels & Groups</span>
            <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => setShowCreateGroup(true)}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          {channels.length === 0 && <div className="px-2 text-xs text-muted-foreground/50">No groups</div>}
          {channels.map(renderItem)}
        </div>

        <div className="mb-6">
          <div className="flex items-center justify-between px-2 mb-2">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Direct Messages</span>
          </div>
          {directs.length === 0 && <div className="px-2 text-xs text-muted-foreground/50">No active DMs</div>}
          {directs.map(renderItem)}
        </div>

        {/* Directory Section */}
        {availableColleagues.length > 0 && (
          <div>
            <div className="flex items-center justify-between px-2 mb-2 mt-4 border-t pt-4">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Colleagues</span>
            </div>
            {availableColleagues.map(colleague => (
              <button
                key={colleague._id}
                onClick={() => handleStartDirectMessage(colleague._id)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg mb-1 text-sm hover:bg-muted text-muted-foreground transition-colors"
              >
                <div className="flex items-center truncate">
                  <div className="relative">
                    <User className="w-4 h-4 mr-2 opacity-70" />
                    {!['In Call', 'In Video Call', 'Screen Sharing'].includes(colleague.status) && colleague.isOnline && (
                      <span className="absolute bottom-0 right-1.5 w-2 h-2 bg-green-500 border border-card rounded-full"></span>
                    )}
                  </div>
                  <span className="truncate font-medium">{colleague.firstName} {colleague.lastName}</span>
                  {getStatusBadge(colleague.status)}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
      
      {showCreateGroup && (
        <CreateGroupModal onClose={() => setShowCreateGroup(false)} />
      )}
      
      <CallHistoryDrawer isOpen={showCallHistory} onClose={() => setShowCallHistory(false)} />
    </div>
  );
}
