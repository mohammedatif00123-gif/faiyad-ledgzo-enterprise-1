import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { motion } from 'framer-motion';
import { PhoneOff, Mic, MicOff, MoreHorizontal, Settings, Users } from 'lucide-react';
import { useWebRTC } from '../../hooks/useWebRTC';
import { endCall, setActiveCall, updateParticipantState } from '../../store/slices/callSlice';
import api from '../../services/api';
import { getAvatarUrl } from '../../utils/avatar';
import { CallSettingsMenu } from './CallSettingsMenu';
import { AddParticipantModal } from './AddParticipantModal';

import * as DropdownMenu from '@radix-ui/react-dropdown-menu';

export function AudioCallWidget({ socket }) {
  const dispatch = useDispatch();
  const { activeCall } = useSelector(state => state.call);
  const { user } = useSelector(state => state.auth);

  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showAddUsers, setShowAddUsers] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(false);

  const targetUserIds = activeCall?.participants?.filter(p => (p._id || p) !== user.id).map(p => p._id || p) || [];
  const [participantsDetails, setParticipantsDetails] = useState({});

  const { 
    initWebRTC, handleOffer, handleAnswer, handleIceCandidate, handlePeerJoined,
    cleanup, forceCleanup, isReady, remoteMediaStreams,
    toggleMute
  } = useWebRTC(socket, activeCall?.callId, user.id, true);

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
        const currentParticipants = activeCall.participants || [];
        if (!currentParticipants.includes(data.from)) {
          dispatch(setActiveCall({ participants: [...currentParticipants, data.from] }));
        }
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
        const currentParticipants = activeCall.participants || [];
        if (!currentParticipants.includes(data.joinedUserId)) {
          dispatch(setActiveCall({ participants: [...currentParticipants, data.joinedUserId] }));
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
    try {
      await api.post(`/calls/${activeCall.callId}/end`);
      socket.emit('call_end', { targetUserId: targetUserIds[0], callId: activeCall.callId });
    } catch (err) {
      console.error(err);
    } finally {
      console.log('🟡 Running useWebRTC cleanup');
      forceCleanup();
      console.log('🔵 Resetting Redux state');
      dispatch(endCall());
      console.log('📞 Call ended successfully');
    }
  };

  const handleToggleMute = () => {
    setIsMuted(!isMuted);
    toggleMute();
    targetUserIds.forEach(tId => {
      socket.emit('participant_muted', { targetUserId: tId, isMuted: !isMuted, callId: activeCall.callId });
    });
  };

  const formatDuration = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // Get primary target to display
  const primaryTargetId = targetUserIds[0];
  const primaryTarget = participantsDetails[primaryTargetId];
  const displayName = targetUserIds.length > 1 ? `${primaryTarget?.firstName} +${targetUserIds.length - 1}` : primaryTarget?.firstName;

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
      <div className="relative -ml-4 flex-shrink-0 bg-slate-900 rounded-2xl">
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
      <div className="flex flex-col ml-3 flex-grow min-w-[100px] pointer-events-none">
        <span className="text-xs font-mono text-slate-400 font-semibold">{formatDuration(duration)}</span>
        <span className="text-sm font-semibold truncate max-w-[120px]">{displayName || 'Connecting...'}</span>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-1.5 ml-2 pointer-events-auto shrink-0">
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
              <DropdownMenu.Item 
                onSelect={() => setShowSettings(true)}
                className="flex items-center gap-2 px-3 py-2 text-sm text-slate-200 outline-none hover:bg-slate-700 rounded-lg cursor-pointer"
              >
                <Settings className="w-4 h-4" /> Settings
              </DropdownMenu.Item>
              <DropdownMenu.Item 
                onSelect={() => setShowAddUsers(true)}
                className="flex items-center gap-2 px-3 py-2 text-sm text-slate-200 outline-none hover:bg-slate-700 rounded-lg cursor-pointer"
              >
                <Users className="w-4 h-4" /> Add users
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>

      {showSettings && (
        <CallSettingsMenu
          onClose={() => setShowSettings(false)}
          isMuted={isMuted}
          isVideoEnabled={false}
          isScreenSharing={false}
          isSpeaker={isSpeaker}
          onToggleMute={handleToggleMute}
          onToggleVideo={() => {}}
          onToggleScreenShare={() => {}}
          onToggleSpeaker={() => setIsSpeaker(!isSpeaker)}
          onFlipCamera={() => {}}
        />
      )}

      {showAddUsers && (
        <AddParticipantModal 
          activeCall={activeCall} 
          onClose={() => setShowAddUsers(false)} 
          onInvite={(userId) => {
            const newParticipants = [...(activeCall.participants || []), userId];
            dispatch(setActiveCall({ participants: newParticipants }));
          }}
        />
      )}
    </motion.div>
  );
}
