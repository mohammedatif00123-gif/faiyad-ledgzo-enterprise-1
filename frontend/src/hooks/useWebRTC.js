import { useEffect, useRef, useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  setNetworkQuality,
  updateParticipantState,
  updateCallStatus,
  endCall as endCallRedux,
  addParticipant
} from '../store/slices/callSlice';
import { useTrackManager } from './useTrackManager';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
};

export function useWebRTC(socket, callId, myUserId) {
  const dispatch = useDispatch();
  const { activeCall } = useSelector(state => state.call);

  const peerConnections = useRef(new Map());
  const iceCandidateQueue = useRef({});
  const timeoutRef = useRef(null);

  const [isReady, setIsReady] = useState(false);
  const [remoteMediaStreams, setRemoteMediaStreams] = useState({});

  // Use the new Track Manager
  const {
    localStream,
    localMediaStream,
    isMediaReady,
    initLocalMedia,
    toggleAudio,
    toggleVideo: tmToggleVideo,
    startScreenShare: tmStartScreenShare,
    stopScreenShare: tmStopScreenShare,
    cleanupTracks
  } = useTrackManager(socket, callId);

  // Initialize WebRTC and Local Media
  const initWebRTC = useCallback(async () => {
    await initLocalMedia();
    setIsReady(true);
  }, [initLocalMedia]);

  const createPeerConnection = useCallback((targetUserId, isInitiator) => {
    if (peerConnections.current.has(targetUserId)) {
      return peerConnections.current.get(targetUserId);
    }

    const pc = new RTCPeerConnection(ICE_SERVERS);
    peerConnections.current.set(targetUserId, pc);

    // 1. Add Local Tracks
    if (localStream.current) {
      localStream.current.getTracks().forEach(track => {
        pc.addTrack(track, localStream.current);
      });
    }

    // 2. ICE Candidate Handling
    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit('webrtc_ice_candidate', {
          targetUserId,
          callId,
          candidate: event.candidate
        });
      }
    };

    // 3. Connection State Handling
    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      dispatch(updateParticipantState({ userId: targetUserId, connectionState: state }));

      if (state === 'connected') {
        dispatch(updateCallStatus('Connected'));
        dispatch(setNetworkQuality('Excellent'));
      }
    };

    // 4. Track Handling (Remote streams)
    pc.ontrack = (event) => {
      // Direct assignment of event.streams[0] to the participant
      setRemoteMediaStreams(prev => ({
        ...prev,
        [targetUserId]: event.streams[0]
      }));
    };

    // 5. RENEGOTIATION (The Core Fix)
    // Fires automatically when tracks are dynamically added or removed via pc.addTrack / pc.removeTrack
    pc.onnegotiationneeded = async () => {
      try {
        if (pc.signalingState !== 'stable') return;
        
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        
        if (socket) {
          socket.emit('webrtc_offer', {
            targetUserId,
            callId,
            offer
          });
        }
      } catch (err) {
        console.error('[useWebRTC] Error during renegotiation:', err);
      }
    };

    // Initial Offer Creation (if initiator)
    if (isInitiator) {
      pc.createOffer()
        .then(offer => pc.setLocalDescription(offer).then(() => {
          if (socket) {
            socket.emit('webrtc_offer', {
              targetUserId,
              callId,
              offer
            });
          }
        }))
        .catch(console.error);
    }

    return pc;
  }, [socket, callId, dispatch, localStream]);

  // Peer Joined Event
  const handlePeerJoined = useCallback(async (targetUserId) => {
    dispatch(addParticipant(targetUserId));
    if (isMediaReady) {
      createPeerConnection(targetUserId, true);
    }
  }, [createPeerConnection, dispatch, isMediaReady]);

  // Handle Incoming Offer
  const handleOffer = useCallback(async (offer, fromUserId) => {
    dispatch(addParticipant(fromUserId));
    
    // Make sure we have media before creating a PC and sending answer
    if (!isMediaReady) {
      await initWebRTC(); 
    }

    const pc = createPeerConnection(fromUserId, false);

    try {
      if (pc.signalingState !== 'stable' && pc.signalingState !== 'have-remote-offer') {
        console.warn('[useWebRTC] Ignoring offer, wrong signaling state:', pc.signalingState);
        return; // Alternatively, handle glare (SDP collisions) if necessary
      }

      await pc.setRemoteDescription(new RTCSessionDescription(offer));

      // Process queued ICE candidates
      if (iceCandidateQueue.current[fromUserId]) {
        for (const candidate of iceCandidateQueue.current[fromUserId]) {
          await pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(console.error);
        }
        iceCandidateQueue.current[fromUserId] = [];
      }

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      if (socket) {
        socket.emit('webrtc_answer', {
          targetUserId: fromUserId,
          callId,
          answer
        });
      }
    } catch (err) {
      console.error('[useWebRTC] Failed to handle offer:', err);
    }
  }, [createPeerConnection, socket, callId, isMediaReady, initWebRTC, dispatch]);

  // Handle Incoming Answer
  const handleAnswer = useCallback(async (answer, fromUserId) => {
    const pc = peerConnections.current.get(fromUserId);
    if (!pc) return;
    try {
      if (pc.signalingState === 'have-local-offer') {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));

        // Process queued ICE candidates
        if (iceCandidateQueue.current[fromUserId]) {
          for (const candidate of iceCandidateQueue.current[fromUserId]) {
            await pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(console.error);
          }
          iceCandidateQueue.current[fromUserId] = [];
        }
      }
    } catch (err) {
      console.error('[useWebRTC] Failed to handle answer:', err);
    }
  }, []);

  // Handle Incoming ICE Candidate
  const handleIceCandidate = useCallback(async (candidate, fromUserId) => {
    const pc = peerConnections.current.get(fromUserId);
    if (!pc) {
      if (!iceCandidateQueue.current[fromUserId]) iceCandidateQueue.current[fromUserId] = [];
      iceCandidateQueue.current[fromUserId].push(candidate);
      return;
    }
    
    try {
      if (pc.remoteDescription) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } else {
        if (!iceCandidateQueue.current[fromUserId]) iceCandidateQueue.current[fromUserId] = [];
        iceCandidateQueue.current[fromUserId].push(candidate);
      }
    } catch (e) {
      console.error('[useWebRTC] Error adding received ice candidate:', e);
    }
  }, []);


  // --- Track Managers wrapped for peer connections ---

  const toggleMute = useCallback((isMuted) => {
    toggleAudio(isMuted);
    // Optional: emit mute status so others can see "muted" icon
    if (socket) {
      peerConnections.current.forEach((_, peerId) => {
        socket.emit('participant_muted', { targetUserId: peerId, isMuted });
      });
    }
  }, [toggleAudio, socket]);

  const toggleVideo = useCallback(async (isEnabled) => {
    await tmToggleVideo(isEnabled, peerConnections);
    if (socket) {
      peerConnections.current.forEach((_, peerId) => {
        socket.emit('camera_toggle', { targetUserId: peerId, isEnabled });
      });
    }
  }, [tmToggleVideo, socket]);

  const startScreenShare = useCallback(async () => {
    const stream = await tmStartScreenShare(peerConnections);
    if (stream && socket) {
      peerConnections.current.forEach((_, peerId) => {
        socket.emit('screen_share_start', { targetUserId: peerId });
      });
    }
    return stream;
  }, [tmStartScreenShare, socket]);

  const stopScreenShare = useCallback(() => {
    tmStopScreenShare(peerConnections);
    if (socket) {
      peerConnections.current.forEach((_, peerId) => {
        socket.emit('screen_share_stop', { targetUserId: peerId });
      });
    }
  }, [tmStopScreenShare, socket]);


  // --- Cleanup ---
  const cleanupCall = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    cleanupTracks(); // Stops local media

    if (peerConnections.current.size > 0) {
      peerConnections.current.forEach(pc => {
        pc.ontrack = null;
        pc.onicecandidate = null;
        pc.onconnectionstatechange = null;
        pc.onnegotiationneeded = null;
        pc.close();
      });
      peerConnections.current.clear();
    }

    setRemoteMediaStreams({});
    setIsReady(false);
    iceCandidateQueue.current = {};
    
    dispatch(endCallRedux());
  }, [cleanupTracks, dispatch]);

  const forceCleanup = useCallback(() => {
    cleanupCall();
  }, [cleanupCall]);

  const endCall = useCallback(() => {
    if (socket && callId) {
      socket.emit('call:end', { callId });
    }
    cleanupCall();
  }, [socket, callId, cleanupCall]);

  // Initiate calls if initiator
  useEffect(() => {
    if (isReady && activeCall?.isInitiator && activeCall.participants) {
      activeCall.participants.forEach((pId) => {
        const idStr = pId._id || pId;
        if (idStr !== myUserId) {
          createPeerConnection(idStr, true);
        }
      });
    }
  }, [isReady, activeCall?.isInitiator, activeCall?.participants, myUserId, createPeerConnection]);

  // Auto cleanup on unmount or external end
  useEffect(() => {
    if (activeCall?.status === 'Ended' || activeCall?.status === 'Rejected') {
      cleanupCall();
    }
  }, [activeCall?.status, cleanupCall]);

  useEffect(() => {
    return () => {
      cleanupCall();
    };
  }, [cleanupCall]);

  return {
    initWebRTC,
    handleOffer,
    handleAnswer,
    handleIceCandidate,
    handlePeerJoined,
    toggleMute,
    toggleVideo,
    startScreenShare,
    stopScreenShare,
    endCall,
    cleanupCall,
    cleanup: cleanupCall,
    forceCleanup,
    isReady,
    localMediaStream,
    remoteMediaStreams
  };
}