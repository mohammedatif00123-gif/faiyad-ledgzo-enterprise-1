import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Mic, MicOff, Phone, Volume2, Settings, Signal, User, UserPlus, Share2, Loader2 } from 'lucide-react';
import { useWebRTC } from '../../hooks/useWebRTC';
import { endCall, setActiveCall, addCallParticipant } from '../../store/slices/callSlice';
import { setActiveConversation } from '../../store/slices/chatSlice';
import api from '../../services/api';
import { getAvatarUrl } from '../../utils/avatar';
import { AddParticipantModal } from './AddParticipantModal';
import { ChatArea } from '../chat/ChatArea';
import { useSpeechDetection } from '../../hooks/useSpeechDetection';

// Component for rendering a single participant's tile
export const ParticipantTile = ({ userDetails, stream, isMuted, isSpeaking, label, connectionState, isLocal }) => {
  const isActuallySpeaking = useSpeechDetection(stream);

  return (
    <div className="flex flex-col items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/10 relative">
      <audio 
        autoPlay 
        muted={isLocal} 
        ref={audio => { if (audio && audio.srcObject !== stream) audio.srcObject = stream; }} 
      />
      <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-white/10 flex items-center justify-center overflow-hidden border-4 border-primary/30 relative">
        {userDetails?.avatar ? (
          <img src={getAvatarUrl(userDetails.avatar)} alt="Avatar" className="w-full h-full object-cover" />
        ) : (
          <User className="w-12 h-12 text-white/50" />
        )}
        {/* Speaking Indicator */}
        {(isSpeaking || isActuallySpeaking) && (
          <div className="absolute inset-0 border-4 border-green-500 rounded-full animate-pulse" />
        )}
      </div>
      <div className="text-center">
        <h3 className="font-medium text-lg">
          {userDetails ? `${userDetails.firstName} ${userDetails.lastName}` : label}
          {isLocal && ' (You)'}
        </h3>
        <p className="text-white/60 text-xs flex items-center justify-center gap-1">
          {(connectionState === 'disconnected' || connectionState === 'failed') ? (
            <><Loader2 className="w-3 h-3 animate-spin" /> Reconnecting...</>
          ) : (
            connectionState === 'connected' ? (userDetails?.department || 'Connected') : 'Connecting...'
          )}
        </p>
      </div>
      {isMuted && (
        <div className="absolute top-4 right-4 bg-red-500 rounded-full p-1.5 shadow-lg">
          <MicOff className="w-3 h-3 text-white" />
        </div>
      )}
    </div>
  );
};

export function VoiceCallPage({ socket }) {
  const dispatch = useDispatch();
  const { activeCall, networkQuality, participantStates } = useSelector(state => state.call);
  const { user } = useSelector(state => state.auth);
  const { conversations } = useSelector(state => state.chat);
  
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  
  const targetUserIds = activeCall?.participants?.filter(p => (p._id || p) !== user.id).map(p => p._id || p) || [];
  const conversation = conversations.find(c => c._id === activeCall?.conversationId);
  const isGroupCall = conversation?.type === 'channel';

  const [participantsDetails, setParticipantsDetails] = useState({});
  const [showChat, setShowChat] = useState(false);
  const normalizeParticipantIds = (participants = []) => Array.from(new Set((participants || []).map(p => typeof p === 'string' ? p : p?._id || p).filter(Boolean)));

  const { 
    initWebRTC, handleOffer, handleAnswer, handleIceCandidate, handlePeerJoined,
    toggleMute, cleanup, isReady, remoteMediaStreams, localMediaStream, startScreenShare, stopScreenShare
  } = useWebRTC(socket, activeCall?.callId, user.id);

  // Fetch details for all remote participants
  useEffect(() => {
    if (targetUserIds.length > 0) {
      api.get(`/chat/directory`)
        .then(res => {
          const details = {};
          targetUserIds.forEach(id => {
            const u = res.data.data.find(emp => emp._id === id);
            if (u) details[id] = u;
          });
          setParticipantsDetails(details);
        })
        .catch(console.error);
    }
  }, [JSON.stringify(targetUserIds)]);

  useEffect(() => {
    // Start WebRTC when active call changes to Connecting/Connected
    if (activeCall && (activeCall.status === 'Connecting' || activeCall.status === 'Connected') && !isReady) {
      initWebRTC();
    }
  }, [activeCall, initWebRTC, isReady]);

  useEffect(() => {
    if (!socket || !isReady) return;

    const onOffer = async (data) => {
      if (data.callId === activeCall?.callId) {
        dispatch(addCallParticipant(data.from));
        await handleOffer(data.offer, data.from);
      }
    };

    const onAnswer = async (data) => {
      if (data.callId === activeCall?.callId) {
        await handleAnswer(data.answer, data.from);
      }
    };

    const onCandidate = async (data) => {
      if (data.callId === activeCall?.callId) {
        await handleIceCandidate(data.candidate, data.from);
      }
    };

    const onPeerJoined = (data) => {
      if (data.callId === activeCall?.callId) {
        dispatch(addCallParticipant(data.joinedUserId));
        handlePeerJoined(data.joinedUserId);
      }
    };

    socket.on('webrtc_offer', onOffer);
    socket.on('webrtc_answer', onAnswer);
    socket.on('webrtc_ice_candidate', onCandidate);
    socket.on('peer_joined_call', onPeerJoined);

    return () => {
      socket.off('webrtc_offer', onOffer);
      socket.off('webrtc_answer', onAnswer);
      socket.off('webrtc_ice_candidate', onCandidate);
      socket.off('peer_joined_call', onPeerJoined);
    };
  }, [socket, isReady, activeCall, handleOffer, handleAnswer, handleIceCandidate, handlePeerJoined, dispatch]);

  // Duration timer
  useEffect(() => {
    if (activeCall?.status === 'Connecting') {
      setDuration(0);
    } else if (activeCall?.status === 'Connected') {
      const interval = setInterval(() => setDuration(d => d + 1), 1000);
      return () => clearInterval(interval);
    }
  }, [activeCall?.status]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore if typing in an input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      if (e.key.toLowerCase() === 'm') {
        handleToggleMute();
      } else if (e.key === 'Escape') {
        handleEndCall();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMuted, activeCall]);

  const handleEndCall = () => {
    if (activeCall?.callId) {
      api.post(`/calls/${activeCall.callId}/end`).catch(console.error);
      socket.emit('call_end', { targetUserId: activeCall.participants[0], callId: activeCall.callId }); // Actually it should emit to room or individual
    }
    cleanup();
    dispatch(endCall());
  };

  const handleToggleMute = () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    toggleMute(newMuted);
  };

  const handleToggleScreenShare = async () => {
    if (isScreenSharing) {
      stopScreenShare();
      setIsScreenSharing(false);
    } else {
      const displayStream = await startScreenShare();
      if (displayStream) {
        setIsScreenSharing(true);
        displayStream.getVideoTracks()[0].onended = () => {
          setIsScreenSharing(false);
        };
      }
    }
  };

  const formatDuration = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const getNetworkColor = () => {
    if (networkQuality === 'Excellent') return 'text-green-500';
    if (networkQuality === 'Good') return 'text-yellow-500';
    return 'text-red-500';
  };

  const handleToggleChat = () => {
    if (!showChat && activeCall?.conversationId) {
      dispatch(setActiveConversation(activeCall.conversationId));
    }
    setShowChat(!showChat);
  };

  if (!activeCall) return null;

  return (
    <div className="absolute inset-0 z-50 flex flex-row overflow-hidden bg-black/95 text-white animate-in fade-in duration-300">
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col items-center justify-between overflow-y-auto">
        {/* Header Info */}
      <div className="w-full flex justify-between p-6 shrink-0">
        <div className="flex items-center gap-2">
          <Signal className={`w-5 h-5 ${getNetworkColor()}`} />
          <span className="text-sm font-medium">{networkQuality} Connection</span>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={handleToggleChat} 
            className={`p-2 rounded-full transition-colors ${showChat ? 'bg-primary/20 text-primary' : 'hover:bg-white/10'}`}
            title="Chat"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
          </button>
          {isGroupCall && (
            <div className="px-3 py-1 bg-white/10 rounded-full border border-white/20">
              <span className="font-semibold text-white/90 text-sm">{conversation?.name}</span>
            </div>
          )}
          <div className="text-primary font-mono text-xl">
            {activeCall.status === 'Connected' ? formatDuration(duration) : activeCall.status}
          </div>
          <button className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <Settings className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Main Call Info / Grid */}
      <div className="flex-1 w-full max-w-6xl p-6 flex items-center justify-center">
        <div className={`grid gap-6 w-full ${targetUserIds.length > 0 ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4' : 'grid-cols-1 max-w-sm'}`}>
          {[user.id, ...targetUserIds].map(id => {
            const isLocal = id === user.id;
            const state = isLocal ? { muted: isMuted, speaking: false, connectionState: 'connected' } : (participantStates[id] || {});
            const stream = isLocal ? localMediaStream : remoteMediaStreams[id];
            const details = isLocal ? user : participantsDetails[id];
            return (
              <ParticipantTile 
                key={id}
                userDetails={details}
                stream={stream}
                isMuted={state.muted}
                isSpeaking={state.speaking}
                connectionState={state.connectionState}
                label={isLocal ? "You" : "Connecting..."}
                isLocal={isLocal}
              />
            );
          })}
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-6 p-8 shrink-0">
        <button 
          onClick={handleToggleMute}
          className={`p-5 rounded-full transition-all ${isMuted ? 'bg-white/90 text-black' : 'bg-white/10 text-white hover:bg-white/20'}`}
          title={isMuted ? "Unmute" : "Mute"}
        >
          {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
        </button>
        
        <button 
          onClick={handleToggleScreenShare}
          className={`p-5 rounded-full transition-all ${isScreenSharing ? 'bg-green-500 text-white' : 'bg-white/10 text-white hover:bg-white/20'}`}
          title={isScreenSharing ? "Stop Screen Share" : "Share Screen"}
        >
          <Share2 className="w-6 h-6" />
        </button>

        <button 
          onClick={() => setShowAddModal(true)}
          className="p-5 rounded-full bg-white/10 text-white hover:bg-white/20 transition-all"
          title="Add Participant"
        >
          <UserPlus className="w-6 h-6" />
        </button>

        <button 
          onClick={handleEndCall}
          className="p-6 rounded-full bg-red-500 text-white hover:bg-red-600 transition-all shadow-[0_0_20px_rgba(239,68,68,0.4)]"
          title="End Call"
        >
          <Phone className="w-8 h-8 rotate-[135deg]" />
        </button>

        <button 
          onClick={() => setIsSpeaker(!isSpeaker)}
          className={`p-5 rounded-full transition-all ${isSpeaker ? 'bg-white/90 text-black' : 'bg-white/10 text-white hover:bg-white/20'}`}
          title={isSpeaker ? "Speaker Off" : "Speaker On"}
        >
          <Volume2 className="w-6 h-6" />
        </button>
      </div>

      {showAddModal && (
        <AddParticipantModal 
          activeCall={activeCall} 
          onClose={() => setShowAddModal(false)} 
          onInvite={(userId) => {
            const newParticipants = normalizeParticipantIds([...(activeCall.participants || []), userId]);
            dispatch(setActiveCall({ participants: newParticipants }));
          }}
        />
      )}
      </div>

      {/* Chat Drawer */}
      {showChat && (
        <div className="w-80 md:w-96 border-l border-white/10 bg-[var(--ent-background)] flex flex-col h-full z-10 animate-in slide-in-from-right duration-300 shrink-0">
          <div className="flex-1 overflow-hidden relative">
            <ChatArea socket={socket} />
          </div>
        </div>
      )}
    </div>
  );
}
