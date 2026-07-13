import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Mic, MicOff, Phone, Volume2, Settings, Signal, User, UserPlus, Share2 } from 'lucide-react';
import { useWebRTC } from '../../hooks/useWebRTC';
import { endCall, setActiveCall } from '../../store/slices/callSlice';
import api from '../../services/api';
import { getAvatarUrl } from '../../utils/avatar';
import { AddParticipantModal } from './AddParticipantModal';

// Component for rendering a single participant's tile
export const ParticipantTile = ({ userDetails, stream, isMuted, isSpeaking, label, connectionState }) => {
  useEffect(() => {
    if (stream) {
      const audio = new Audio();
      audio.srcObject = stream;
      audio.autoplay = true;
      audio.play().catch(e => console.log('Audio play failed', e));
    }
  }, [stream]);

  return (
    <div className="flex flex-col items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/10 relative">
      <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-white/10 flex items-center justify-center overflow-hidden border-4 border-primary/30 relative">
        {userDetails?.avatar ? (
          <img src={getAvatarUrl(userDetails.avatar)} alt="Avatar" className="w-full h-full object-cover" />
        ) : (
          <User className="w-12 h-12 text-white/50" />
        )}
        {/* Speaking Indicator */}
        {isSpeaking && (
          <div className="absolute inset-0 border-4 border-green-500 rounded-full animate-pulse" />
        )}
      </div>
      <div className="text-center">
        <h3 className="font-medium text-lg">{userDetails ? `${userDetails.firstName} ${userDetails.lastName}` : label}</h3>
        <p className="text-white/60 text-xs">
          {connectionState === 'connected' ? (userDetails?.department || 'Connected') : 'Connecting...'}
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
  const normalizeParticipantIds = (participants = []) => Array.from(new Set((participants || []).map(p => typeof p === 'string' ? p : p?._id || p).filter(Boolean)));

  const { 
    initWebRTC, handleOffer, handleAnswer, handleIceCandidate, handlePeerJoined,
    toggleMute, cleanup, isReady, remoteMediaStreams, startScreenShare, stopScreenShare
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
        const currentParticipants = activeCall.participants || [];
        const nextParticipants = normalizeParticipantIds([...currentParticipants, data.from]);
        if (JSON.stringify(nextParticipants) !== JSON.stringify(normalizeParticipantIds(currentParticipants))) {
          dispatch(setActiveCall({ participants: nextParticipants }));
        }
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
        // Add them to redux activeCall participants so UI updates
        const currentParticipants = activeCall.participants || [];
        const nextParticipants = normalizeParticipantIds([...currentParticipants, data.joinedUserId]);
        if (JSON.stringify(nextParticipants) !== JSON.stringify(normalizeParticipantIds(currentParticipants))) {
          dispatch(setActiveCall({ participants: nextParticipants }));
        }
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
    if (activeCall?.status !== 'Connected') return;
    const interval = setInterval(() => setDuration(d => d + 1), 1000);
    return () => clearInterval(interval);
  }, [activeCall?.status]);

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

  if (!activeCall) return null;

  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-between bg-black/95 text-white animate-in fade-in duration-300 overflow-y-auto">
      
      {/* Header Info */}
      <div className="w-full flex justify-between p-6 shrink-0">
        <div className="flex items-center gap-2">
          <Signal className={`w-5 h-5 ${getNetworkColor()}`} />
          <span className="text-sm font-medium">{networkQuality} Connection</span>
        </div>
        <div className="flex items-center gap-4">
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
        <div className={`grid gap-6 w-full ${targetUserIds.length > 1 ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4' : 'grid-cols-1 max-w-sm'}`}>
          {targetUserIds.map(id => {
            const state = participantStates[id] || {};
            const stream = remoteMediaStreams[id];
            const details = participantsDetails[id];
            return (
              <ParticipantTile 
                key={id}
                userDetails={details}
                stream={stream}
                isMuted={state.muted}
                isSpeaking={state.speaking}
                connectionState={state.connectionState}
                label="Connecting..."
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
  );
}
