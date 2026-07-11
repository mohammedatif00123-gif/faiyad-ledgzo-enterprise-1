import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { setActiveConversation, setConversations, removeConversation } from '../../store/slices/chatSlice';
import { Hash, User, Plus, Users, MoreVertical, LogOut, Phone } from 'lucide-react';
import { Button } from '../ui/Button';
import { CreateGroupModal } from './CreateGroupModal';
import api from '../../services/api';

export function ChatSidebar({ socket }) {
  const dispatch = useDispatch();
  const { conversations, activeConversation, readReceipts, typing: stateTyping, messages } = useSelector(state => state.chat);
  const { user } = useSelector(state => state.auth);
  const [directory, setDirectory] = useState([]);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [menuOpen, setMenuOpen] = useState(null); // stores conversation ID

  useEffect(() => {
    // Fetch directory to show users we can chat with
    api.get('/chat/directory')
      .then(res => {
        // Filter out ourselves
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

  const sortedConversations = [...conversations].sort((a, b) => getLatestTime(b) - getLatestTime(a));

  const channels = sortedConversations.filter(c => c.type === 'channel');
  const directs = sortedConversations.filter(c => c.type === 'direct');

  const handleSelect = (id) => {
    dispatch(setActiveConversation(id));
  };

  const handleStartDirectMessage = async (partnerId) => {
    try {
      const res = await api.post('/chat/direct', { partnerId });
      const newConv = res.data.data;
      
      // If it's a new conversation not in our list, fetch all convos again or just add it
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
      await api.post(`/groups/${groupId}/leave`);
      dispatch(removeConversation(groupId));
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
        className={`group w-full flex flex-col items-start justify-center px-3 py-2 rounded-md mb-1 text-sm transition-colors cursor-pointer ${isActive ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted text-muted-foreground'}`}
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
            {conv.type === 'direct' && conv.partnerId && ['In Call', 'In Video Call', 'Screen Sharing'].includes(directory.find(u => u._id === conv.partnerId)?.status) && (
              <span className="ml-2 flex items-center gap-1 text-[10px] text-yellow-600 dark:text-yellow-500 bg-yellow-500/10 px-1.5 py-0.5 rounded-md border border-yellow-500/20 whitespace-nowrap">
                <Phone className="w-2.5 h-2.5" /> In a meet
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {unread > 0 && (
              <span className="bg-primary text-primary-foreground text-xs font-bold px-1.5 py-0.5 rounded-full">
                {unread}
              </span>
            )}
            {conv.type === 'channel' && (
              <div className="relative" onClick={(e) => e.stopPropagation()}>
                <button 
                  onClick={() => setMenuOpen(menuOpen === conv._id ? null : conv._id)}
                  className="p-1 rounded-md hover:bg-black/10 dark:hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>
                {menuOpen === conv._id && (
                  <div className="absolute right-0 top-6 w-36 bg-popover border rounded-md shadow-lg z-50 overflow-hidden text-popover-foreground">
                    <button 
                      onClick={(e) => handleLeaveGroup(e, conv._id)}
                      className="w-full text-left px-3 py-2 text-xs hover:bg-muted text-destructive flex items-center gap-2"
                    >
                      <LogOut className="w-3 h-3" /> Leave Group
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        
        {/* Preview Line */}
        <div className="w-full flex items-center mt-1 text-xs opacity-70 pl-6 truncate">
          {typingUsers.length > 0 ? (
            <span className="text-primary italic animate-pulse">Typing...</span>
          ) : lastMessage ? (
            <span className="truncate">
              {lastMessage.sender?._id === user.id ? 'You: ' : ''}
              {lastMessage.messageType === 'voice' ? '🎤 Voice message' : lastMessage.attachments?.length > 0 ? '📎 Attachment' : lastMessage.content}
            </span>
          ) : (
            <span className="truncate italic">No messages yet</span>
          )}
        </div>
      </div>
    );
  };

  // Find users in directory we don't have a DM with yet
  const availableColleagues = directory.filter(dUser => {
    return !directs.some(conv => conv.partnerId === dUser._id);
  });

  return (
    <div className="flex flex-col h-full bg-card" onClick={() => setMenuOpen(null)}>
      <div className="p-4 border-b flex items-center justify-between">
        <h2 className="font-semibold tracking-tight">Messages</h2>
      </div>
      
      <div className="flex-1 overflow-y-auto p-3 scrollbar-hide">
        <div className="mb-6">
          <div className="flex items-center justify-between px-2 mb-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Channels & Groups</span>
            <Button variant="ghost" size="icon" className="h-4 w-4" onClick={() => setShowCreateGroup(true)}>
              <Plus className="w-3 h-3" />
            </Button>
          </div>
          {channels.length === 0 && <div className="px-2 text-xs text-muted-foreground/50">No groups</div>}
          {channels.map(renderItem)}
        </div>

        <div className="mb-6">
          <div className="flex items-center justify-between px-2 mb-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Direct Messages</span>
          </div>
          {directs.length === 0 && <div className="px-2 text-xs text-muted-foreground/50">No active DMs</div>}
          {directs.map(renderItem)}
        </div>

        {/* Directory Section */}
        {availableColleagues.length > 0 && (
          <div>
            <div className="flex items-center justify-between px-2 mb-2 mt-4 border-t pt-4">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Colleagues</span>
            </div>
            {availableColleagues.map(colleague => (
              <button
                key={colleague._id}
                onClick={() => handleStartDirectMessage(colleague._id)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-md mb-1 text-sm hover:bg-muted text-muted-foreground transition-colors"
              >
                <div className="flex items-center truncate">
                  <div className="relative">
                    <User className="w-4 h-4 mr-2 opacity-70" />
                    {!['In Call', 'In Video Call', 'Screen Sharing'].includes(colleague.status) && colleague.isOnline && (
                      <span className="absolute bottom-0 right-1.5 w-2 h-2 bg-green-500 border border-card rounded-full"></span>
                    )}
                  </div>
                  <span className="truncate">{colleague.firstName} {colleague.lastName}</span>
                  {['In Call', 'In Video Call', 'Screen Sharing'].includes(colleague.status) && (
                    <span className="ml-2 flex items-center gap-1 text-[10px] text-yellow-600 dark:text-yellow-500 bg-yellow-500/10 px-1.5 py-0.5 rounded-md border border-yellow-500/20 whitespace-nowrap">
                      <Phone className="w-2.5 h-2.5" /> In a meet
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
      
      {showCreateGroup && (
        <CreateGroupModal onClose={() => setShowCreateGroup(false)} />
      )}
    </div>
  );
}
