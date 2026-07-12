import React from 'react';
import { Phone, Video, MonitorUp, Info, Users, ShieldAlert, ArrowLeft, Search, ChevronDown } from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { Button } from '../ui/Button';
import { useSelector, useDispatch } from 'react-redux';
import { setActiveCall } from '../../store/slices/callSlice';
import { setActiveConversation } from '../../store/slices/chatSlice';
import api from '../../services/api';
import { toast } from 'sonner';
import { VideoPreJoinModal } from '../call/VideoPreJoinModal';
import { GroupCallInitiateModal } from './GroupCallInitiateModal';

export function ChatHeader({ conversation, onToggleInfo, onSearchClick, socket }) {
  const { typing } = useSelector(state => state.chat);
  const { user } = useSelector(state => state.auth);
  const dispatch = useDispatch();

  if (!conversation) return null;

  const [pendingCallType, setPendingCallType] = React.useState(null);
  const [showGroupCallInitiate, setShowGroupCallInitiate] = React.useState(false);

  const executeStartCall = async (type, initialSettings = {}, selectedParticipants = []) => {
    try {
      const res = await api.post('/calls/start', {
        conversationId: conversation._id,
        participants: selectedParticipants, // Send selected participants for group calls
        callType: type,
        ...initialSettings
      });

      const callSession = res.data.data.callSession;
      
      dispatch(setActiveCall({
        callId: callSession._id,
        conversationId: conversation._id,
        status: 'Ringing',
        participants: callSession.participants,
        callType: type,
        isInitiator: true,
        initialSettings
      }));

      // Emit call_invite to all other participants
      if (socket) {
        callSession.participants.forEach(pId => {
          const targetId = pId._id || pId;
          if (targetId !== user.id) {
            socket.emit('call_invite', {
              targetUserId: targetId,
              callId: callSession._id,
              conversationId: conversation._id,
              callType: type,
              callerDetails: {
                _id: user.id,
                firstName: user.firstName,
                lastName: user.lastName,
                avatar: user.avatar
              }
            });
          }
        });
      }

    } catch (err) {
      console.error('Failed to start call', err);
      if (err.response && err.response.data && err.response.data.message) {
        toast.error(err.response.data.message);
      } else {
        toast.error('Failed to start call');
      }
    }
  };

  const handleStartCall = async (type) => {
    if (conversation.type === 'channel') {
      setPendingCallType(type);
      setShowGroupCallInitiate(true);
      return;
    }
    
    if (type === 'video' || type === 'screen_share') {
      setPendingCallType(type);
    } else {
      await executeStartCall(type);
    }
  };

  const handleGroupCallInitiate = (selectedIds) => {
    setShowGroupCallInitiate(false);
    
    // Check if we need VideoPreJoinModal
    if (pendingCallType === 'video' || pendingCallType === 'screen_share') {
      // Don't clear pendingCallType yet, we still need it for VideoPreJoinModal
      // But we need a way to pass selectedIds through PreJoin to executeStartCall
      // Let's attach it to state
      setPendingGroupMembers(selectedIds);
    } else {
      const type = pendingCallType;
      setPendingCallType(null);
      executeStartCall(type, {}, selectedIds);
    }
  };

  const [pendingGroupMembers, setPendingGroupMembers] = React.useState([]);

  const handlePreJoin = (settings) => {
    const type = pendingCallType;
    setPendingCallType(null);
    executeStartCall(type, settings, pendingGroupMembers);
    setPendingGroupMembers([]);
  };

  const convTyping = typing[conversation._id] || {};
  const typingUsers = Object.keys(convTyping).filter(uid => convTyping[uid] && uid !== user.id);

  return (
    <div className="h-16 border-b border-[var(--ent-border)] bg-[var(--ent-surface)] flex items-center justify-between px-4 md:px-6 shrink-0 z-10">
      <div className="flex items-center gap-2 md:gap-3 overflow-hidden">
        <Button 
          variant="ghost" 
          size="icon" 
          className="md:hidden shrink-0 mr-1 text-muted-foreground hover:text-foreground" 
          onClick={() => dispatch(setActiveConversation(null))}
          title="Back to Messages"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        {conversation.avatar && (
          <div className="w-10 h-10 shrink-0 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden border">
            <img src={conversation.avatar} alt="avatar" className="w-full h-full object-cover" />
          </div>
        )}
        <div className="flex flex-col">
          <div className="font-semibold text-lg flex items-center gap-2">
            {!conversation.avatar && (conversation.type === 'channel' ? '#' : '@')} {conversation.name}
            {conversation.visibility === 'private' && <ShieldAlert className="w-4 h-4 text-muted-foreground" title="Private Group" />}
          </div>
          {conversation.type === 'channel' && (
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <Users className="w-3 h-3" /> {conversation.memberCount || 0} members 
              {typingUsers.length > 0 && (
                <span className="text-primary ml-2 animate-pulse italic">typing...</span>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <Button variant="secondary" className="gap-1 px-3 text-blue-500 bg-blue-500/10 hover:bg-blue-500/20 rounded-lg">
              <Phone className="w-4 h-4" />
              <ChevronDown className="w-3 h-3" />
            </Button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content 
              className="bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-xl shadow-xl min-w-[200px] p-2 z-50 mt-1"
              align="end"
            >
              <DropdownMenu.Item onClick={() => handleStartCall('voice')} className="flex items-center gap-3 px-3 py-3 text-[15px] hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg cursor-pointer outline-none">
                <Phone className="w-5 h-5 text-slate-500" /> Audio Call
              </DropdownMenu.Item>
              
              <DropdownMenu.Item onClick={() => handleStartCall('video')} className="flex items-center gap-3 px-3 py-3 text-[15px] hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg cursor-pointer outline-none">
                <Video className="w-5 h-5 text-slate-500" /> Video Call
              </DropdownMenu.Item>
              
              <DropdownMenu.Item onClick={() => handleStartCall('screen_share')} className="flex items-center gap-3 px-3 py-3 text-[15px] hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg cursor-pointer outline-none">
                <MonitorUp className="w-5 h-5 text-slate-500" /> Screen Share
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>

        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary" onClick={onSearchClick} title="Search Messages">
          <Search className="w-5 h-5" />
        </Button>
        <div className="w-px h-6 bg-border mx-1" />
        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary" onClick={onToggleInfo}>
          <Info className="w-5 h-5" />
        </Button>
      </div>

      {pendingCallType && !showGroupCallInitiate && (
        <VideoPreJoinModal 
          user={user} 
          callType={pendingCallType} 
          onJoin={handlePreJoin} 
          onCancel={() => { setPendingCallType(null); setPendingGroupMembers([]); }} 
        />
      )}

      {showGroupCallInitiate && (
        <GroupCallInitiateModal
          conversationId={conversation._id}
          callType={pendingCallType}
          onClose={() => { setShowGroupCallInitiate(false); setPendingCallType(null); }}
          onStartCall={handleGroupCallInitiate}
        />
      )}
    </div>
  );
}
