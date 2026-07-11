import { useEffect, useRef, useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setNetworkQuality, updateParticipantState, updateCallStatus } from '../store/slices/callSlice';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
};

export function useWebRTC(socket, callId, myUserId) {
  const dispatch = useDispatch();
  const { devices, activeCall } = useSelector(state => state.call);
  
  const peerConnections = useRef(new Map());
  const localStream = useRef(null);
  
  const [isReady, setIsReady] = useState(false);
  const [localMediaStream, setLocalMediaStream] = useState(null);
  const [remoteMediaStreams, setRemoteMediaStreams] = useState({}); // { [userId]: MediaStream }
  
  const localMediaReadyPromise = useRef(null);
  const resolveLocalMediaReady = useRef(null);
  
  if (!localMediaReadyPromise.current) {
    localMediaReadyPromise.current = new Promise(resolve => {
      resolveLocalMediaReady.current = resolve;
    });
  }
  
  const initWebRTC = useCallback(async () => {
    try {
      // 1. Get Local Media if not already
      if (!localStream.current) {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            deviceId: devices.audioInput === 'default' ? undefined : { exact: devices.audioInput },
            echoCancellation: devices.echoCancellation,
            noiseSuppression: devices.noiseSuppression,
          },
          video: activeCall?.callType === 'video' || activeCall?.callType === 'meeting' ? {
            facingMode: 'user'
          } : false
        });

        // Apply initial settings from PreJoin
        if (activeCall?.initialSettings) {
          if (activeCall.initialSettings.isMuted) {
            stream.getAudioTracks().forEach(t => t.enabled = false);
          }
          if (activeCall.initialSettings.isVideoEnabled === false) {
            stream.getVideoTracks().forEach(t => t.enabled = false);
          }
        }

        localStream.current = stream;
        setLocalMediaStream(stream);
      }
      setIsReady(true);
      if (resolveLocalMediaReady.current) {
        resolveLocalMediaReady.current();
      }
    } catch (err) {
      console.error('Error initializing WebRTC:', err);
    }
  }, [devices]);

  // Create a peer connection for a specific target user
  const createPeerConnection = useCallback((targetUserId, isInitiator) => {
    if (peerConnections.current.has(targetUserId)) {
       return peerConnections.current.get(targetUserId);
    }

    const pc = new RTCPeerConnection(ICE_SERVERS);
    peerConnections.current.set(targetUserId, pc);

    // Add local tracks
    if (localStream.current) {
      localStream.current.getTracks().forEach(track => {
        pc.addTrack(track, localStream.current);
      });
    }

    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit('webrtc_ice_candidate', {
          targetUserId,
          callId,
          candidate: event.candidate
        });
      }
    };

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      dispatch(updateParticipantState({ userId: targetUserId, connectionState: state }));
      
      let allConnected = true;
      let hasConnected = false;
      peerConnections.current.forEach(peer => {
         if (peer.connectionState === 'connected') hasConnected = true;
         if (peer.connectionState !== 'connected') allConnected = false;
      });

      if (hasConnected) {
        dispatch(updateCallStatus('Connected'));
        if (allConnected) dispatch(setNetworkQuality('Excellent'));
      }
      if (state === 'disconnected') {
        // cleanup this PC? Maybe leave it for now or handle peer exit
      }
    };

    pc.ontrack = (event) => {
      setRemoteMediaStreams(prev => {
        const currentStream = prev[targetUserId] || new MediaStream();
        event.streams[0].getTracks().forEach(track => {
          if (!currentStream.getTracks().includes(track)) {
            currentStream.addTrack(track);
          }
        });
        return { ...prev, [targetUserId]: currentStream };
      });
    };

    if (isInitiator) {
      pc.createOffer().then(offer => {
        return pc.setLocalDescription(offer).then(() => {
          socket.emit('webrtc_offer', {
            targetUserId,
            callId,
            offer
          });
        });
      }).catch(console.error);
    }

    return pc;
  }, [socket, callId, dispatch]);

  const handlePeerJoined = useCallback(async (targetUserId) => {
    await localMediaReadyPromise.current;
    createPeerConnection(targetUserId, true);
  }, [createPeerConnection]);

  const handleOffer = useCallback(async (offer, fromUserId) => {
    await localMediaReadyPromise.current;
    const pc = createPeerConnection(fromUserId, false);
    
    try {
      if (pc.signalingState !== 'stable' && pc.signalingState !== 'have-local-offer') {
        // Only set remote offer if we can
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        if (pc.signalingState !== 'stable') {
          await pc.setLocalDescription(answer);
        }
        socket.emit('webrtc_answer', {
          targetUserId: fromUserId,
          callId,
          answer
        });
      } else if (pc.signalingState === 'stable') {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('webrtc_answer', {
          targetUserId: fromUserId,
          callId,
          answer
        });
      }
    } catch (err) {
      console.error('Failed to handle offer properly', err);
    }
  }, [isReady, createPeerConnection, socket, callId]);

  const handleAnswer = useCallback(async (answer, fromUserId) => {
    const pc = peerConnections.current.get(fromUserId);
    if (!pc) return;
    try {
      if (pc.signalingState !== 'stable') {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
      }
    } catch (err) {
      console.error('Failed to handle answer', err);
    }
  }, []);

  const handleIceCandidate = useCallback(async (candidate, fromUserId) => {
    const pc = peerConnections.current.get(fromUserId);
    if (!pc) return;
    try {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (e) {
      console.error('Error adding received ice candidate', e);
    }
  }, []);

  const toggleMute = useCallback((isMuted) => {
    if (localStream.current) {
      localStream.current.getAudioTracks().forEach(track => {
        track.enabled = !isMuted;
      });
      peerConnections.current.forEach((_, peerId) => {
         socket.emit('participant_muted', { targetUserId: peerId, isMuted });
      });
    }
  }, [socket]);

  const toggleVideo = useCallback(async (isEnabled) => {
    if (localStream.current) {
      let videoTrack = localStream.current.getVideoTracks()[0];
      
      // If we didn't have a video track because it was a voice call, get one
      if (isEnabled && !videoTrack) {
        try {
          const vStream = await navigator.mediaDevices.getUserMedia({ video: true });
          videoTrack = vStream.getVideoTracks()[0];
          localStream.current.addTrack(videoTrack);
          setLocalMediaStream(new MediaStream(localStream.current.getTracks()));
          
          // Add track to all existing connections (requires renegotiation, simplistic approach)
          peerConnections.current.forEach(pc => {
             pc.addTrack(videoTrack, localStream.current);
             // Negotiation should technically trigger here
          });
        } catch(e) { console.error('Failed to get video', e); return; }
      } else if (videoTrack) {
        videoTrack.enabled = isEnabled;
      }
      
      peerConnections.current.forEach((_, peerId) => {
         socket.emit('camera_toggle', { targetUserId: peerId, isEnabled });
      });
    }
  }, [socket]);

  const startScreenShare = useCallback(async () => {
    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const screenTrack = displayStream.getVideoTracks()[0];
      
      // Replace video track in all peer connections
      peerConnections.current.forEach(pc => {
        const senders = pc.getSenders();
        const videoSender = senders.find(s => s.track && s.track.kind === 'video');
        if (videoSender) {
          videoSender.replaceTrack(screenTrack);
        } else {
          pc.addTrack(screenTrack, localStream.current);
        }
      });
      
      peerConnections.current.forEach((_, peerId) => {
         socket.emit('screen_share_start', { targetUserId: peerId });
      });
      
      screenTrack.onended = () => {
        stopScreenShare();
      };
      
      return displayStream;
    } catch (e) {
      console.error('Failed to start screen share', e);
      return null;
    }
  }, [socket]);

  const stopScreenShare = useCallback(() => {
    const videoTrack = localStream.current?.getVideoTracks()[0];
    
    peerConnections.current.forEach(pc => {
      const senders = pc.getSenders();
      const videoSender = senders.find(s => s.track && s.track.kind === 'video');
      if (videoSender && videoTrack) {
        videoSender.replaceTrack(videoTrack);
      }
    });
    
    peerConnections.current.forEach((_, peerId) => {
       socket.emit('screen_share_stop', { targetUserId: peerId });
    });
  }, [socket]);

  const cleanup = useCallback(() => {
    if (localStream.current) {
      localStream.current.getTracks().forEach(track => track.stop());
    }
    peerConnections.current.forEach(pc => pc.close());
    peerConnections.current.clear();
    setLocalMediaStream(null);
    setRemoteMediaStreams({});
    setIsReady(false);
    
    // Reset promise for future calls
    localMediaReadyPromise.current = new Promise(resolve => {
      resolveLocalMediaReady.current = resolve;
    });
  }, []);

  // Initiate call with all existing participants if initiator
  useEffect(() => {
    if (isReady && activeCall?.isInitiator && activeCall.participants) {
      activeCall.participants.forEach(pId => {
        const idStr = pId._id || pId;
        if (idStr !== myUserId) {
          createPeerConnection(idStr, true);
        }
      });
    }
  }, [isReady, activeCall?.isInitiator, activeCall?.participants, myUserId, createPeerConnection]);

  // Clean up when call ends externally or internally
  useEffect(() => {
    if (!activeCall || activeCall.status === 'Ended' || activeCall.status === 'Rejected') {
      cleanup();
    }
  }, [activeCall, cleanup]);

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
    cleanup,
    isReady,
    localMediaStream,
    remoteMediaStreams
  };
}
