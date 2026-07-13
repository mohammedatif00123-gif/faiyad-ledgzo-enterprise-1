import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Signal, Minimize } from 'lucide-react';
import { useWebRTC } from '../../hooks/useWebRTC';
import { endCall, setActiveCall, updateParticipantState, addParticipant } from '../../store/slices/callSlice';
import api from '../../services/api';

import { CallToolbar } from './CallToolbar';
import { ParticipantsDrawer } from './ParticipantsDrawer';
import { CallSettingsMenu } from './CallSettingsMenu';
import { ParticipantGrid } from './ParticipantGrid';
import { ScreenShareView } from './ScreenShareView';

export function VideoCallPage({ socket }) {
  const dispatch = useDispatch();
  const { activeCall, networkQuality, participantStates } = useSelector(state => state.call);
  const { user } = useSelector(state => state.auth);
  const { conversations } = useSelector(state => state.chat);
  
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(activeCall?.initialSettings?.isMuted || false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(activeCall?.initialSettings?.isVideoEnabled ?? (activeCall?.callType === 'video'));
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isHandRaised, setIsHandRaised] = useState(false);
  
  const [showParticipants, setShowParticipants] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeScreenShareId, setActiveScreenShareId] = useState(null); // Which user is sharing
  const [screenShareStream, setScreenShareStream] = useState(null); // Local screen share stream

  const targetUserIds = activeCall?.participants?.filter(p => (p._id || p) !== user.id).map(p => p._id || p) || [];
  const conversation = conversations.find(c => c._id === activeCall?.conversationId);
  const isGroupCall = conversation?.type === 'channel';

  const [participantsDetails, setParticipantsDetails] = useState({});

  const { 
    initWebRTC, handleOffer, handleAnswer, handleIceCandidate, handlePeerJoined,
    toggleMute, toggleVideo, startScreenShare, stopScreenShare, cleanup, forceCleanup, isReady, 
    localMediaStream, remoteMediaStreams 
  } = useWebRTC(socket, activeCall?.callId, user.id);

  // Fetch details
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
    if (activeCall && (activeCall.status === 'Connecting' || activeCall.status === 'Connected') && !isReady && (activeCall.callType === 'video' || activeCall.callType === 'screen_share')) {
      initWebRTC();
      setIsVideoEnabled(activeCall?.initialSettings?.isVideoEnabled ?? (activeCall.callType === 'video'));
    }
  }, [activeCall?.status, isReady, activeCall?.callType, activeCall?.initialSettings]);

  // Auto-start screen share for screen_share calls (initiator only)
  useEffect(() => {
    if (isReady && activeCall?.callType === 'screen_share' && activeCall?.isInitiator && !isScreenSharing) {
      // Small timeout to allow WebRTC connection to establish
      const timer = setTimeout(() => {
        handleToggleScreenShare();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isReady, activeCall?.callType, activeCall?.isInitiator]);

  // Duration timer
  useEffect(() => {
    if (activeCall?.status === 'Connected') {
      const interval = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [activeCall?.status]);

  // Clean up screen share stream if call ends externally
  useEffect(() => {
    if (!activeCall || activeCall.status === 'Ended' || activeCall.status === 'Rejected') {
      if (screenShareStream) {
        screenShareStream.getTracks().forEach(track => track.stop());
      }
    }
  }, [activeCall?.status, screenShareStream]);



  // Socket listeners for new features
  useEffect(() => {
    if (!socket || !activeCall || activeCall.callType === 'voice') return;

    const onOffer = async (data) => {
      if (data.callId === activeCall?.callId) {
        dispatch(addParticipant(data.from));
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
        dispatch(addParticipant(data.joinedUserId));
        handlePeerJoined(data.joinedUserId);
      }
    };

    const onCameraToggle = (data) => {
      dispatch(updateParticipantState({ userId: data.from, videoEnabled: data.isEnabled }));
    };

    const onScreenShareStart = (data) => {
      setActiveScreenShareId(data.from);
      dispatch(updateParticipantState({ userId: data.from, screenSharing: true }));
    };

    const onScreenShareStop = (data) => {
      if (activeScreenShareId === data.from) setActiveScreenShareId(null);
      dispatch(updateParticipantState({ userId: data.from, screenSharing: false }));
    };

    const onRaiseHand = (data) => {
      dispatch(updateParticipantState({ userId: data.from, handRaised: data.isRaised }));
    };

    socket.on('webrtc_offer', onOffer);
    socket.on('webrtc_answer', onAnswer);
    socket.on('webrtc_ice_candidate', onCandidate);
    socket.on('peer_joined_call', onPeerJoined);
    socket.on('camera_toggle', onCameraToggle);
    socket.on('screen_share_start', onScreenShareStart);
    socket.on('screen_share_stop', onScreenShareStop);
    socket.on('raise_hand', onRaiseHand);

    return () => {
      socket.off('webrtc_offer', onOffer);
      socket.off('webrtc_answer', onAnswer);
      socket.off('webrtc_ice_candidate', onCandidate);
      socket.off('peer_joined_call', onPeerJoined);
      socket.off('camera_toggle', onCameraToggle);
      socket.off('screen_share_start', onScreenShareStart);
      socket.off('screen_share_stop', onScreenShareStop);
      socket.off('raise_hand', onRaiseHand);
    };
  }, [socket, activeCall, handleOffer, handleAnswer, handleIceCandidate, handlePeerJoined, dispatch, activeScreenShareId]);

  // Duration timer
  useEffect(() => {
    if (activeCall?.status === 'Connecting') {
      setDuration(0);
    } else if (activeCall?.status === 'Connected') {
      const interval = setInterval(() => setDuration(d => d + 1), 1000);
      return () => clearInterval(interval);
    }
  }, [activeCall?.status]);

  const handleEndCall = () => {
    console.log('📞 Ending call intentionally');
    if (activeCall?.callId) {
      api.post(`/calls/${activeCall.callId}/end`).catch(console.error);
      socket.emit('call_end', { targetUserId: activeCall.participants[0], callId: activeCall.callId });
    }
    if (isScreenSharing) stopScreenShare();
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
  };

  const handleToggleVideo = () => {
    const newVideoEnabled = !isVideoEnabled;
    setIsVideoEnabled(newVideoEnabled);
    toggleVideo(newVideoEnabled);
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
        setActiveScreenShareId(user.id);
        setScreenShareStream(displayStream);
        
        displayStream.getVideoTracks()[0].onended = () => {
          setIsScreenSharing(false);
          setActiveScreenShareId(null);
          setScreenShareStream(null);
          // stopScreenShare is called internally by useWebRTC
        };
      }
    }
  };

  const handleToggleHandRaise = () => {
    const newHandRaised = !isHandRaised;
    setIsHandRaised(newHandRaised);
    targetUserIds.forEach(peerId => {
      socket.emit('raise_hand', { targetUserId: peerId, isRaised: newHandRaised });
    });
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(e => console.error(e));
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
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

  if (!activeCall || activeCall.status === 'Ringing' || activeCall.status === 'Ended' || activeCall.status === 'Rejected' || activeCall.callType === 'voice') {
    return null;
  }
  // Render logic: Grid vs Screen Share
  const allParticipants = [user.id, ...targetUserIds];
  const isScreenShareActive = !!activeScreenShareId;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gray-950 text-white overflow-hidden animate-in fade-in duration-300">
      
      {/* Top Header */}
      <div className="flex justify-between items-center p-4 bg-gradient-to-b from-black/80 to-transparent absolute top-0 left-0 right-0 z-10 pointer-events-none">
        <div className="flex items-center"></div>
        
        <div className="flex flex-col items-center pointer-events-auto">
          {isGroupCall && (
            <span className="text-white font-bold bg-black/40 backdrop-blur-md px-3 py-1 rounded-full text-sm mb-1 border border-white/10">
              {conversation?.name}
            </span>
          )}
          <div className="px-4 py-1.5 bg-black/40 backdrop-blur-md rounded-full font-mono text-sm border border-white/10 tracking-widest text-center shadow-lg">
            {formatDuration(duration)}
          </div>
        </div>

        <div className="flex items-center gap-3 pointer-events-auto">
          <div className={`p-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center gap-2 px-3`}>
            <Signal className={`w-4 h-4 ${getNetworkColor()}`} />
            <span className="text-xs font-medium">{networkQuality}</span>
          </div>
          {isScreenSharing && (
            <div className="px-3 py-1 bg-primary/20 border border-primary/30 rounded-full text-xs text-primary font-medium flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              You are sharing your screen
            </div>
          )}
        </div>
        <div className="font-mono text-lg font-medium drop-shadow-md bg-black/40 px-3 py-1 rounded-lg backdrop-blur-md border border-white/10 pointer-events-auto">
          {activeCall.status === 'Connected' ? formatDuration(duration) : activeCall.status}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 w-full flex overflow-hidden relative pt-16 pb-2">
        {isScreenShareActive ? (
          <ScreenShareView 
            screenStream={activeScreenShareId === user.id ? screenShareStream : remoteMediaStreams[activeScreenShareId]}
            presenterId={activeScreenShareId}
            participants={allParticipants}
            remoteStreams={remoteMediaStreams}
            localStream={localMediaStream}
            localUserId={user.id}
            participantDetails={participantsDetails}
            participantStates={participantStates}
          />
        ) : (
          <ParticipantGrid 
            participants={allParticipants}
            localStream={localMediaStream}
            remoteStreams={remoteMediaStreams}
            participantStates={participantStates}
            participantDetails={participantsDetails}
            localUserId={user.id}
          />
        )}

        {/* Side Drawers */}
        <ParticipantsDrawer 
          isOpen={showParticipants} 
          onClose={() => setShowParticipants(false)}
          activeCall={activeCall}
          participantDetails={participantsDetails}
        />
      </div>

      {/* Toolbar */}
      <CallToolbar 
        isMuted={isMuted}
        isVideoEnabled={isVideoEnabled}
        isScreenSharing={isScreenSharing}
        isHandRaised={isHandRaised}
        onToggleMute={handleToggleMute}
        onToggleVideo={handleToggleVideo}
        onToggleScreenShare={handleToggleScreenShare}
        onToggleHandRaise={handleToggleHandRaise}
        onOpenSettings={() => setShowSettings(true)}
        onToggleParticipants={() => setShowParticipants(!showParticipants)}
        onToggleChat={() => {}} // Could slide out chat
        onToggleFullscreen={toggleFullscreen}
        onEndCall={handleEndCall}
      />

      {/* Modals */}
      {showSettings && (
        <CallSettingsMenu 
          onClose={() => setShowSettings(false)}
          isMuted={isMuted}
          isVideoEnabled={isVideoEnabled}
          isScreenSharing={isScreenSharing}
          isSpeaker={false}
          onToggleMute={handleToggleMute}
          onToggleVideo={handleToggleVideo}
          onToggleScreenShare={handleToggleScreenShare}
          onToggleSpeaker={() => {}} // No speaker toggle in VideoCallPage yet
          onFlipCamera={() => {}} // No flip camera yet
        />
      )}
    </div>
  );
}
