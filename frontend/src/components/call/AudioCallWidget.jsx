import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { motion } from 'framer-motion';
import { PhoneOff, Mic, MicOff, MoreHorizontal, Settings, Users, Signal, Volume2, Phone, UserPlus, MonitorUp } from 'lucide-react';
import { useWebRTC } from '../../hooks/useWebRTC';
import { endCall, setActiveCall, updateParticipantState, addCallParticipant } from '../../store/slices/callSlice';
import api from '../../services/api';
import { getAvatarUrl } from '../../utils/avatar';

import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { ParticipantTile } from './VoiceCallPage';
import { AddParticipantModal } from './AddParticipantModal';
import { VideoSettingsModal } from './VideoSettingsModal';
import { ScreenShareView } from './ScreenShareView';

export function AudioCallWidget({ socket }) {
  const dispatch = useDispatch();
  const { activeCall } = useSelector(state => state.call);
  const { user } = useSelector(state => state.auth);

  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  const targetUserIds = activeCall?.participants?.filter(p => (p._id || p) !== (user?._id || user?.id)).map(p => p._id || p) || [];
  const [participantsDetails, setParticipantsDetails] = useState({});
  const normalizeParticipantIds = (participants = []) => Array.from(new Set((participants || []).map(p => typeof p === 'string' ? p : p?._id || p).filter(Boolean)));
  const { networkQuality, participantStates } = useSelector(state => state.call);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [activeScreenShareId, setActiveScreenShareId] = useState(null);
  const [screenShareStream, setScreenShareStream] = useState(null);

  const { 
    initWebRTC, handleOffer, handleAnswer, handleIceCandidate, handlePeerJoined,
    cleanup, forceCleanup, isReady, remoteMediaStreams, localMediaStream,
    toggleMute, startScreenShare, stopScreenShare
  } = useWebRTC(socket, activeCall?.callId, (user?._id || user?.id));

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
    if (activeCall && 
        (activeCall.status === 'Connecting' || activeCall.status === 'Connected') && 
        !isReady && 
        activeCall.callType === 'voice') {
      initWebRTC();
    }
  }, [activeCall?.status, activeCall?.callType, isReady, initWebRTC]);

  // Socket listeners for WebRTC signaling
  useEffect(() => {
    if (!socket || !activeCall || activeCall.callType !== 'voice') return;

    const onOffer = async (data) => {
      if (data.callId === activeCall?.callId) {
        dispatch(addCallParticipant(data.from));
        await handleOffer(data.offer, data.from);
      }
    };

    const onAnswer = async (data) => {
      if (data.callId === activeCall?.callId) await handleAnswer(data.answer, data.from);
    };

    const onCandidate = async (data) => {
      if (data.callId === activeCall?.callId) await handleIceCandidate(data.candidate, data.from);
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
  }, [socket, activeCall, handleOffer, handleAnswer, handleIceCandidate, handlePeerJoined, dispatch]);

  // Duration timer
  useEffect(() => {
    if (activeCall?.status === 'Connecting') {
      setDuration(0);
    } else if (activeCall?.status === 'Connected') {
      const interval = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [activeCall?.status]);

  if (!activeCall || activeCall.status === 'Ringing' || activeCall.status === 'Ended' || activeCall.status === 'Rejected' || activeCall.callType === 'video') {
    return null;
  }

  const handleHangUp = async () => {
    console.log('📞 Ending audio call intentionally');
    if (activeCall?.callId) {
      api.post(`/calls/${activeCall.callId}/end`).catch(console.error);
    }
    console.log('🟡 Running useWebRTC cleanup');
    forceCleanup();
    console.log('🔵 Resetting Redux state');
    dispatch(endCall());
    console.log('📞 Call ended successfully');
  };

  const handleToggleMute = () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    toggleMute(newMuted);
    targetUserIds.forEach(tId => {
      socket.emit('participant_muted', { targetUserId: tId, isMuted: newMuted, callId: activeCall.callId });
    });
  };

  const handleToggleScreenShare = async () => {
    if (isScreenSharing) {
      stopScreenShare();
      setIsScreenSharing(false);
      setActiveScreenShareId(null);
      setScreenShareStream(null);
    } else {
      const displayStream = await startScreenShare();
      if (displayStream) {
        setIsScreenSharing(true);
        setActiveScreenShareId((user?._id || user?.id));
        setScreenShareStream(displayStream);
        
        displayStream.getVideoTracks()[0].onended = () => {
          setIsScreenSharing(false);
          setActiveScreenShareId(null);
          setScreenShareStream(null);
        };
      }
    }
  };

  const remoteScreenShareId = Object.keys(remoteMediaStreams).find(
    id => remoteMediaStreams[id] && remoteMediaStreams[id].getVideoTracks().length > 0
  );
  
  const currentScreenShareId = isScreenSharing ? (user?._id || user?.id) : remoteScreenShareId;
  const activeStream = isScreenSharing ? screenShareStream : (remoteScreenShareId ? remoteMediaStreams[remoteScreenShareId] : null);

  const formatDuration = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // Get primary target to display
  const primaryTargetId = targetUserIds[0];
  const primaryTarget = participantsDetails[primaryTargetId];
  const displayName = targetUserIds.length > 1 ? `${primaryTarget?.firstName} +${targetUserIds.length - 1}` : primaryTarget?.firstName;

  const isExpanded = !isMinimized;

  if (isExpanded) {
    return (
      <div className="fixed inset-0 z-[100] flex flex-col items-center justify-between bg-black/95 text-white animate-in fade-in duration-300 overflow-y-auto">
        {/* Remote Audio Elements */}
        {Object.entries(remoteMediaStreams).map(([peerId, stream]) => (
          <audio key={peerId} autoPlay ref={(ref) => { if (ref && ref.srcObject !== stream) ref.srcObject = stream; }} />
        ))}
        
        {/* Header Info */}
        <div className="w-full flex justify-between p-6 shrink-0">
          <div className="flex items-center gap-2">
            <Signal className="w-5 h-5 text-green-500" />
            <span className="text-sm font-medium">{networkQuality || 'Good'} Connection</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-primary font-mono text-xl">
              {activeCall.status === 'Connected' ? formatDuration(duration) : activeCall.status}
            </div>
            <button onClick={() => setIsMinimized(true)} className="p-2 hover:bg-white/10 rounded-full transition-colors" title="Minimize">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"></path></svg>
            </button>
            <button onClick={() => setShowSettings(true)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
              <Settings className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Main Call Info / Grid */}
        <div className={`flex-1 w-full max-w-6xl p-6 flex min-h-0 overflow-hidden ${currentScreenShareId && activeStream ? 'flex-col' : 'items-center justify-center'}`}>
          {currentScreenShareId && activeStream ? (
            <ScreenShareView 
              screenStream={activeStream}
              presenterId={currentScreenShareId}
              participantDetails={{...participantsDetails, [(user?._id || user?.id)]: user}}
              participantStates={participantStates}
              participants={[(user?._id || user?.id), ...targetUserIds]}
              remoteStreams={remoteMediaStreams}
              localStream={localMediaStream}
              localUserId={(user?._id || user?.id)}
            />
          ) : (
            <div className="grid gap-6 w-full grid-cols-2 md:grid-cols-3 lg:grid-cols-4 overflow-y-auto max-h-full">
              {[(user?._id || user?.id), ...targetUserIds].map(id => {
                const isLocal = id === (user?._id || user?.id);
                const state = isLocal ? { muted: isMuted, speaking: false, connectionState: 'connected' } : (participantStates?.[id] || {});
                const stream = isLocal ? localMediaStream : remoteMediaStreams[id];
                const details = isLocal ? user : participantsDetails[id];
                return (
                  <ParticipantTile 
                    key={id} userDetails={details} stream={stream}
                    isMuted={state.muted} isSpeaking={state.speaking} connectionState={state.connectionState} 
                    label={isLocal ? "You" : "Connecting..."}
                    isLocal={isLocal}
                  />
                );
              })}
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-6 p-8 shrink-0">
          <button onClick={handleToggleMute} className={`p-5 rounded-full transition-all ${isMuted ? 'bg-white/90 text-black' : 'bg-white/10 text-white hover:bg-white/20'}`} title={isMuted ? "Unmute" : "Mute"}>
            {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
          </button>
          
          <button 
            onClick={handleToggleScreenShare}
            className={`p-5 rounded-full transition-all ${isScreenSharing ? 'bg-green-500 text-white' : 'bg-white/10 text-white hover:bg-white/20'}`}
            title={isScreenSharing ? "Stop Screen Share" : "Share Screen"}
          >
            <MonitorUp className="w-6 h-6" />
          </button>

          <button onClick={() => setShowAddModal(true)} className="p-5 rounded-full bg-white/10 text-white hover:bg-white/20 transition-all" title="Add Participant">
            <UserPlus className="w-6 h-6" />
          </button>
          <button onClick={handleHangUp} className="p-6 rounded-full bg-red-500 text-white hover:bg-red-600 transition-all shadow-[0_0_20px_rgba(239,68,68,0.4)]" title="End Call">
            <Phone className="w-8 h-8 rotate-[135deg]" />
          </button>
          <button onClick={() => setIsSpeaker(!isSpeaker)} className={`p-5 rounded-full transition-all ${isSpeaker ? 'bg-white/90 text-black' : 'bg-white/10 text-white hover:bg-white/20'}`} title={isSpeaker ? "Speaker Off" : "Speaker On"}>
            <Volume2 className="w-6 h-6" />
          </button>
        </div>

        {showSettings && <VideoSettingsModal onClose={() => setShowSettings(false)} />}
        {showAddModal && (
          <AddParticipantModal 
            activeCall={activeCall} 
            onClose={() => setShowAddModal(false)} 
            onInvite={(userId) => {
              dispatch(addCallParticipant(userId));
            }}
          />
        )}
      </div>
    );
  }

  return (
    <motion.div
      drag
      dragMomentum={false}
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed z-[100] bg-slate-900 border border-slate-700 shadow-2xl rounded-2xl flex items-center pr-2 cursor-grab active:cursor-grabbing text-white"
      style={{ top: '80px', right: '40px', touchAction: 'none', height: '64px', minWidth: '320px' }}
    >
      {/* Remote Audio Elements */}
      {Object.entries(remoteMediaStreams).map(([peerId, stream]) => (
        <audio
          key={peerId}
          autoPlay
          ref={(ref) => {
            if (ref && ref.srcObject !== stream) ref.srcObject = stream;
          }}
        />
      ))}

      {/* Avatar Section */}
      <div className="relative -ml-4 flex-shrink-0 bg-slate-900 rounded-2xl" onDoubleClick={() => setIsMinimized(false)}>
        <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-slate-700 bg-slate-800 flex items-center justify-center shadow-lg">
          {primaryTarget?.avatar ? (
            <img src={getAvatarUrl(primaryTarget.avatar)} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            <span className="text-xl font-bold text-slate-300">
              {primaryTarget?.firstName?.charAt(0) || '?'}
            </span>
          )}
        </div>
        {targetUserIds.length > 1 && (
          <div className="absolute -top-1 -right-1 bg-primary text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full border-2 border-slate-900">
            +{targetUserIds.length - 1}
          </div>
        )}
      </div>

      {/* Info Section */}
      <div className="flex flex-col ml-3 flex-grow min-w-[100px]" onDoubleClick={() => setIsMinimized(false)}>
        <span className="text-xs font-mono text-slate-400 font-semibold">{formatDuration(duration)}</span>
        <span className="text-sm font-semibold truncate max-w-[120px]">{displayName || 'Connecting...'}</span>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-1.5 ml-2 pointer-events-auto shrink-0">
        <button
          onClick={() => setIsMinimized(false)}
          className="w-10 h-10 rounded-xl flex items-center justify-center bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          title="Expand"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>
        </button>

        <button
          onClick={handleToggleMute}
          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${isMuted ? 'bg-slate-700 text-red-400' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'}`}
        >
          {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
        </button>
        
        <button
          onClick={handleHangUp}
          className="w-12 h-10 rounded-xl bg-red-500 hover:bg-red-600 flex items-center justify-center text-white transition-colors"
        >
          <PhoneOff className="w-5 h-5" />
        </button>

        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 transition-colors">
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content align="end" className="bg-slate-800 border border-slate-700 rounded-xl shadow-xl p-1 w-48 z-[200]">
              <DropdownMenu.Item onClick={() => setShowSettings(true)} className="flex items-center gap-2 px-3 py-2 text-sm text-slate-200 outline-none hover:bg-slate-700 rounded-lg cursor-pointer">
                <Settings className="w-4 h-4" /> Settings
              </DropdownMenu.Item>
              <DropdownMenu.Item onClick={() => setShowAddModal(true)} className="flex items-center gap-2 px-3 py-2 text-sm text-slate-200 outline-none hover:bg-slate-700 rounded-lg cursor-pointer">
                <Users className="w-4 h-4" /> Add users
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>
      {showSettings && <VideoSettingsModal onClose={() => setShowSettings(false)} />}
      {showAddModal && (
        <AddParticipantModal 
          activeCall={activeCall} 
          onClose={() => setShowAddModal(false)} 
          onInvite={(userId) => {
            dispatch(addCallParticipant(userId));
          }}
        />
      )}
    </motion.div>
  );
}
