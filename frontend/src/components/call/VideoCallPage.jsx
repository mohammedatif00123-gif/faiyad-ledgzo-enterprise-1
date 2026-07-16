import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Signal, Minimize } from 'lucide-react';
import { useWebRTC } from '../../hooks/useWebRTC';
import { endCall, setActiveCall, updateParticipantState, addCallParticipant, removeCallParticipant } from '../../store/slices/callSlice';
import api from '../../services/api';

import { CallToolbar } from './CallToolbar';
import { ChatArea } from '../chat/ChatArea';
import { setActiveConversation } from '../../store/slices/chatSlice';
import { ParticipantsDrawer } from './ParticipantsDrawer';
import { VideoSettingsModal } from './VideoSettingsModal';
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
  const [showChat, setShowChat] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeScreenShareId, setActiveScreenShareId] = useState(null); // Which user is sharing
  const [screenShareStream, setScreenShareStream] = useState(null); // Local screen share stream

  const targetUserIds = activeCall?.participants?.filter(p => (p._id || p) !== (user?._id || user?.id)).map(p => p._id || p) || [];
  const conversation = conversations.find(c => c._id === activeCall?.conversationId);
  const isGroupCall = conversation?.type === 'channel';

  const [participantsDetails, setParticipantsDetails] = useState({});
  const normalizeParticipantIds = (participants = []) => Array.from(new Set((participants || []).map(p => typeof p === 'string' ? p : p?._id || p).filter(Boolean)));

  const { 
    initWebRTC, handleOffer, handleAnswer, handleIceCandidate, handlePeerJoined,
    toggleMute, toggleVideo, startScreenShare, stopScreenShare, cleanup, forceCleanup, removePeerConnection, isReady, 
    localMediaStream, remoteMediaStreams 
  } = useWebRTC(socket, activeCall?.callId, (user?._id || user?.id));

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

    const onParticipantLeft = (data) => {
      if (data.callId === activeCall?.callId) {
        console.log(`[VideoCallPage] Participant left: ${data.userId}`);
        removePeerConnection(data.userId);
        dispatch(removeCallParticipant(data.userId));
        
        // If this user was screen sharing, stop it
        if (activeScreenShareId === data.userId) {
          setActiveScreenShareId(null);
        }
      }
    };

    socket.on('webrtc_offer', onOffer);
    socket.on('webrtc_answer', onAnswer);
    socket.on('webrtc_ice_candidate', onCandidate);
    socket.on('peer_joined_call', onPeerJoined);
    socket.on('camera_toggle', onCameraToggle);
    socket.on('screen_share_start', onScreenShareStart);
    socket.on('screen_share_stop', onScreenShareStop);
    socket.on('raise_hand', onRaiseHand);
    socket.on('participant_left', onParticipantLeft);

    return () => {
      socket.off('webrtc_offer', onOffer);
      socket.off('webrtc_answer', onAnswer);
      socket.off('webrtc_ice_candidate', onCandidate);
      socket.off('peer_joined_call', onPeerJoined);
      socket.off('camera_toggle', onCameraToggle);
      socket.off('screen_share_start', onScreenShareStart);
      socket.off('screen_share_stop', onScreenShareStop);
      socket.off('raise_hand', onRaiseHand);
      socket.off('participant_left', onParticipantLeft);
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

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore if typing in an input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      if (e.key.toLowerCase() === 'm') {
        handleToggleMute();
      } else if (e.key.toLowerCase() === 'v') {
        handleToggleVideo();
      } else if (e.key === 'Escape') {
        handleEndCall();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMuted, isVideoEnabled, activeCall]);

  const handleEndCall = () => {
    console.log('📞 Ending call intentionally');
    if (activeCall?.callId) {
      api.post(`/calls/${activeCall.callId}/end`).catch(console.error);
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

  const handleToggleScreenShare = useCallback(async () => {
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
  }, [isScreenSharing, stopScreenShare, startScreenShare, user]);



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

  const handleToggleChat = () => {
    if (!showChat && activeCall?.conversationId) {
      dispatch(setActiveConversation(activeCall.conversationId));
    }
    setShowChat(!showChat);
    // Auto-close participants if chat opens, on small screens to save space
    if (!showChat && showParticipants) {
      setShowParticipants(false);
    }
  };

  if (!activeCall || activeCall.status === 'Ringing' || activeCall.status === 'Ended' || activeCall.status === 'Rejected' || activeCall.callType === 'voice') {
    return null;
  }

  // Render logic: Grid vs Screen Share
  const allParticipants = [(user?._id || user?.id), ...targetUserIds];
  const isScreenShareOnlyCall = activeCall?.callType === 'screen_share';
  // For screen_share calls: always active (waiting or sharing). For others: only if someone is sharing.
  const isScreenShareActive = !!activeScreenShareId || isScreenShareOnlyCall;
  // Preparing = screen_share call but nobody has started sharing yet
  const isPreparingScreenShare = isScreenShareOnlyCall && !isScreenSharing && !activeScreenShareId;
  const allParticipantDetails = { ...participantsDetails, [(user?._id || user?.id)]: user };

  // For screen_share calls: ALWAYS render ScreenShareView, never the participant grid
  if (isScreenShareOnlyCall) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-gray-950 text-white overflow-hidden animate-in fade-in duration-300">
        {/* Top Header */}
        <div className="flex justify-between items-center px-5 py-3 bg-black/60 backdrop-blur-md border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${networkQuality === 'Excellent' ? 'text-green-400' : networkQuality === 'Good' ? 'text-yellow-400' : 'text-red-400'} bg-white/5 border border-white/10`}>
              <Signal className="w-4 h-4" />
              <span className="text-xs font-medium">{networkQuality}</span>
            </div>
            {activeCall.status === 'Connected' && (
              <div className="px-3 py-1 bg-black/40 rounded-full font-mono text-sm border border-white/10">
                {formatDuration(duration)}
              </div>
            )}
          </div>

          <div className="text-sm font-semibold text-white/80 tracking-wide">
            {isScreenSharing ? (
              <span className="flex items-center gap-2 text-primary">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                You are sharing your screen
              </span>
            ) : isPreparingScreenShare ? (
              <span className="text-white/60">Preparing screen share...</span>
            ) : (
              <span>Screen Share</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {activeCall.status !== 'Connected' && (
              <span className="text-white/50 text-sm">{activeCall.status}</span>
            )}
          </div>
        </div>

        {/* Main: ScreenShareView takes everything */}
        <div className="flex-1 w-full flex overflow-hidden min-h-0">
          <ScreenShareView
            screenStream={activeScreenShareId === (user?._id || user?.id) ? screenShareStream : remoteMediaStreams[activeScreenShareId]}
            presenterId={activeScreenShareId}
            participants={allParticipants}
            remoteStreams={remoteMediaStreams}
            localStream={localMediaStream}
            localUserId={(user?._id || user?.id)}
            participantDetails={allParticipantDetails}
            participantStates={participantStates}
            isPreparing={isPreparingScreenShare}
          />
        </div>

        {/* Minimal toolbar for screen share */}
        <CallToolbar
          isMuted={isMuted}
          isVideoEnabled={isVideoEnabled}
          isScreenSharing={isScreenSharing}
          isHandRaised={isHandRaised}
          isScreenShareOnlyCall={true}
          onToggleMute={handleToggleMute}
          onToggleVideo={handleToggleVideo}
          onToggleScreenShare={handleToggleScreenShare}
          onToggleHandRaise={handleToggleHandRaise}
          onOpenSettings={() => setShowSettings(true)}
          onToggleParticipants={() => {
            setShowParticipants(!showParticipants);
            if (!showParticipants && showChat) setShowChat(false);
          }}
          onToggleChat={handleToggleChat}
          onToggleFullscreen={toggleFullscreen}
          onEndCall={handleEndCall}
        />

        {showSettings && <VideoSettingsModal onClose={() => setShowSettings(false)} />}
      </div>
    );
  }

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
            screenStream={activeScreenShareId === (user?._id || user?.id) ? screenShareStream : remoteMediaStreams[activeScreenShareId]}
            presenterId={activeScreenShareId}
            participants={allParticipants}
            remoteStreams={remoteMediaStreams}
            localStream={localMediaStream}
            localUserId={(user?._id || user?.id)}
            participantDetails={allParticipantDetails}
            participantStates={participantStates}
            isPreparing={isPreparingScreenShare}
          />
        ) : (
          <ParticipantGrid 
            participants={allParticipants}
            localStream={localMediaStream}
            remoteStreams={remoteMediaStreams}
            participantStates={participantStates}
            participantDetails={allParticipantDetails}
            localUserId={(user?._id || user?.id)}
          />
        )}

        {/* Side Drawers */}
        <ParticipantsDrawer 
          isOpen={showParticipants} 
          onClose={() => setShowParticipants(false)}
          activeCall={activeCall}
          participantDetails={allParticipantDetails}
        />

        {/* Chat Drawer */}
        {showChat && (
          <div className="w-80 md:w-96 border-l border-white/10 bg-[var(--ent-background)] flex flex-col h-full z-10 animate-in slide-in-from-right duration-300 shrink-0">
            <div className="flex-1 overflow-hidden relative">
              <ChatArea socket={socket} />
            </div>
          </div>
        )}
      </div>

      {/* Toolbar */}
      <CallToolbar 
        isMuted={isMuted}
        isVideoEnabled={isVideoEnabled}
        isScreenSharing={isScreenSharing}
        isHandRaised={isHandRaised}
        isScreenShareOnlyCall={isScreenShareOnlyCall}
        onToggleMute={handleToggleMute}
        onToggleVideo={handleToggleVideo}
        onToggleScreenShare={handleToggleScreenShare}
        onToggleHandRaise={handleToggleHandRaise}
        onOpenSettings={() => setShowSettings(true)}
        onToggleParticipants={() => {
          setShowParticipants(!showParticipants);
          if (!showParticipants && showChat) setShowChat(false);
        }}
        onToggleChat={handleToggleChat}
        onToggleFullscreen={toggleFullscreen}
        onEndCall={handleEndCall}
      />

      {/* Modals */}
      {showSettings && (
        <VideoSettingsModal onClose={() => setShowSettings(false)} />
      )}
    </div>
  );
}
