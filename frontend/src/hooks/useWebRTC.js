// import { useEffect, useRef, useState, useCallback } from 'react';
// import { useDispatch, useSelector } from 'react-redux';
// import { setNetworkQuality, updateParticipantState, updateCallStatus } from '../store/slices/callSlice';

// const ICE_SERVERS = {
//   iceServers: [
//     { urls: 'stun:stun.l.google.com:19302' },
//     { urls: 'stun:stun1.l.google.com:19302' }
//   ]
// };

// export function useWebRTC(socket, callId, myUserId) {
//   const dispatch = useDispatch();
//   const { devices, activeCall } = useSelector(state => state.call);

//   const peerConnections = useRef(new Map());
//   const localStream = useRef(null);

//   const [isReady, setIsReady] = useState(false);
//   const [localMediaStream, setLocalMediaStream] = useState(null);
//   const [remoteMediaStreams, setRemoteMediaStreams] = useState({}); // { [userId]: MediaStream }

//   const localMediaReadyPromise = useRef(null);
//   const resolveLocalMediaReady = useRef(null);

//   if (!localMediaReadyPromise.current) {
//     localMediaReadyPromise.current = new Promise(resolve => {
//       resolveLocalMediaReady.current = resolve;
//     });
//   }

//   const initWebRTC = useCallback(async () => {
//     try {
//       // 1. Get Local Media if not already
//       if (!localStream.current) {
//         const stream = await navigator.mediaDevices.getUserMedia({
//           audio: {
//             deviceId: devices.audioInput === 'default' ? undefined : { exact: devices.audioInput },
//             echoCancellation: devices.echoCancellation,
//             noiseSuppression: devices.noiseSuppression,
//           },
//           video: activeCall?.callType === 'video' || activeCall?.callType === 'meeting' ? {
//             facingMode: 'user'
//           } : false
//         });

//         // Apply initial settings from PreJoin
//         if (activeCall?.initialSettings) {
//           if (activeCall.initialSettings.isMuted) {
//             stream.getAudioTracks().forEach(t => t.enabled = false);
//           }
//           if (activeCall.initialSettings.isVideoEnabled === false) {
//             stream.getVideoTracks().forEach(t => t.enabled = false);
//           }
//         }

//         localStream.current = stream;
//         setLocalMediaStream(stream);
//       }
//       setIsReady(true);
//       if (resolveLocalMediaReady.current) {
//         resolveLocalMediaReady.current();
//       }
//     } catch (err) {
//       console.error('Error initializing WebRTC:', err);
//     }
//   }, [devices]);

//   // Create a peer connection for a specific target user
//   const createPeerConnection = useCallback((targetUserId, isInitiator) => {
//     if (peerConnections.current.has(targetUserId)) {
//        return peerConnections.current.get(targetUserId);
//     }

//     const pc = new RTCPeerConnection(ICE_SERVERS);
//     peerConnections.current.set(targetUserId, pc);

//     // Add local tracks
//     if (localStream.current) {
//       localStream.current.getTracks().forEach(track => {
//         pc.addTrack(track, localStream.current);
//       });
//     }

//     pc.onicecandidate = (event) => {
//       if (event.candidate && socket) {
//         socket.emit('webrtc_ice_candidate', {
//           targetUserId,
//           callId,
//           candidate: event.candidate
//         });
//       }
//     };

//     pc.onconnectionstatechange = () => {
//       const state = pc.connectionState;
//       dispatch(updateParticipantState({ userId: targetUserId, connectionState: state }));

//       let allConnected = true;
//       let hasConnected = false;
//       peerConnections.current.forEach(peer => {
//          if (peer.connectionState === 'connected') hasConnected = true;
//          if (peer.connectionState !== 'connected') allConnected = false;
//       });

//       if (hasConnected) {
//         dispatch(updateCallStatus('Connected'));
//         if (allConnected) dispatch(setNetworkQuality('Excellent'));
//       }
//       if (state === 'disconnected') {
//         // cleanup this PC? Maybe leave it for now or handle peer exit
//       }
//     };

//     pc.ontrack = (event) => {
//       setRemoteMediaStreams(prev => {
//         const tracks = prev[targetUserId] ? prev[targetUserId].getTracks() : [];
//         event.streams[0].getTracks().forEach(track => {
//           if (!tracks.includes(track)) {
//             tracks.push(track);
//           }
//         });
//         return { ...prev, [targetUserId]: new MediaStream(tracks) };
//       });
//     };

//     if (isInitiator) {
//       pc.createOffer().then(offer => {
//         return pc.setLocalDescription(offer).then(() => {
//           socket.emit('webrtc_offer', {
//             targetUserId,
//             callId,
//             offer
//           });
//         });
//       }).catch(console.error);
//     }

//     return pc;
//   }, [socket, callId, dispatch]);

//   const handlePeerJoined = useCallback(async (targetUserId) => {
//     await localMediaReadyPromise.current;
//     createPeerConnection(targetUserId, true);
//   }, [createPeerConnection]);

//   const handleOffer = useCallback(async (offer, fromUserId) => {
//     await localMediaReadyPromise.current;
//     const pc = createPeerConnection(fromUserId, false);

//     try {
//       if (pc.signalingState !== 'stable') {
//         console.warn('Ignoring offer in non-stable state:', pc.signalingState);
//         return;
//       }

//       await pc.setRemoteDescription(new RTCSessionDescription(offer));

//       // Process queued ICE candidates
//       if (iceCandidateQueue.current[fromUserId]) {
//         for (const candidate of iceCandidateQueue.current[fromUserId]) {
//           await pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(console.error);
//         }
//         iceCandidateQueue.current[fromUserId] = [];
//       }

//       const answer = await pc.createAnswer();
//       await pc.setLocalDescription(answer);

//       socket.emit('webrtc_answer', {
//         targetUserId: fromUserId,
//         callId,
//         answer
//       });
//     } catch (err) {
//       console.error('Failed to handle offer properly', err);
//     }
//   }, [isReady, createPeerConnection, socket, callId]);

//   const iceCandidateQueue = useRef({});

//   const handleAnswer = useCallback(async (answer, fromUserId) => {
//     const pc = peerConnections.current.get(fromUserId);
//     if (!pc) return;
//     try {
//       if (pc.signalingState === 'have-local-offer' || pc.signalingState === 'have-remote-offer') {
//         await pc.setRemoteDescription(new RTCSessionDescription(answer));
//         // Process queued ICE candidates
//         if (iceCandidateQueue.current[fromUserId]) {
//           for (const candidate of iceCandidateQueue.current[fromUserId]) {
//             await pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(console.error);
//           }
//           iceCandidateQueue.current[fromUserId] = [];
//         }
//       }
//     } catch (err) {
//       console.error('Failed to handle answer', err);
//     }
//   }, []);

//   const handleIceCandidate = useCallback(async (candidate, fromUserId) => {
//     const pc = peerConnections.current.get(fromUserId);
//     if (!pc) return;
//     try {
//       if (pc.remoteDescription) {
//         await pc.addIceCandidate(new RTCIceCandidate(candidate));
//       } else {
//         if (!iceCandidateQueue.current[fromUserId]) iceCandidateQueue.current[fromUserId] = [];
//         iceCandidateQueue.current[fromUserId].push(candidate);
//       }
//     } catch (e) {
//       console.error('Error adding received ice candidate', e);
//     }
//   }, []);

//   const toggleMute = useCallback((isMuted) => {
//     if (localStream.current) {
//       localStream.current.getAudioTracks().forEach(track => {
//         track.enabled = !isMuted;
//       });
//       peerConnections.current.forEach((_, peerId) => {
//          socket.emit('participant_muted', { targetUserId: peerId, isMuted });
//       });
//     }
//   }, [socket]);

//   const toggleVideo = useCallback(async (isEnabled) => {
//     if (localStream.current) {
//       let videoTrack = localStream.current.getVideoTracks()[0];

//       // If we didn't have a video track because it was a voice call, get one
//       if (isEnabled && !videoTrack) {
//         try {
//           const vStream = await navigator.mediaDevices.getUserMedia({ video: true });
//           videoTrack = vStream.getVideoTracks()[0];
//           localStream.current.addTrack(videoTrack);
//           setLocalMediaStream(new MediaStream(localStream.current.getTracks()));

//           // Add track to all existing connections (requires renegotiation, simplistic approach)
//           peerConnections.current.forEach(pc => {
//              pc.addTrack(videoTrack, localStream.current);
//              // Negotiation should technically trigger here
//           });
//         } catch(e) { console.error('Failed to get video', e); return; }
//       } else if (videoTrack) {
//         videoTrack.enabled = isEnabled;
//       }

//       peerConnections.current.forEach((_, peerId) => {
//          socket.emit('camera_toggle', { targetUserId: peerId, isEnabled });
//       });
//     }
//   }, [socket]);

//   const startScreenShare = useCallback(async () => {
//     try {
//       const displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
//       const screenTrack = displayStream.getVideoTracks()[0];

//       // Replace video track in all peer connections
//       peerConnections.current.forEach(pc => {
//         const senders = pc.getSenders();
//         const videoSender = senders.find(s => s.track && s.track.kind === 'video');
//         if (videoSender) {
//           videoSender.replaceTrack(screenTrack);
//         } else {
//           pc.addTrack(screenTrack, localStream.current);
//         }
//       });

//       peerConnections.current.forEach((_, peerId) => {
//          socket.emit('screen_share_start', { targetUserId: peerId });
//       });

//       screenTrack.onended = () => {
//         stopScreenShare();
//       };

//       return displayStream;
//     } catch (e) {
//       console.error('Failed to start screen share', e);
//       return null;
//     }
//   }, [socket]);

//   const stopScreenShare = useCallback(() => {
//     const videoTrack = localStream.current?.getVideoTracks()[0];

//     peerConnections.current.forEach(pc => {
//       const senders = pc.getSenders();
//       const videoSender = senders.find(s => s.track && s.track.kind === 'video');
//       if (videoSender && videoTrack) {
//         videoSender.replaceTrack(videoTrack);
//       }
//     });

//     peerConnections.current.forEach((_, peerId) => {
//        socket.emit('screen_share_stop', { targetUserId: peerId });
//     });
//   }, [socket]);

//   const cleanupCall = useCallback(() => {
//     console.log('🟢 [useWebRTC] Starting cleanupCall');

//     // 5. Stops ALL media tracks
//     if (localStream.current) {
//       console.log('🔴 [useWebRTC] Stopping all media tracks');
//       localStream.current.getTracks().forEach(track => {
//         track.stop();
//         console.log(`[useWebRTC] Stopped track: ${track.kind}`);
//       });
//       localStream.current = null;
//     }

//     // 3. Closes PeerConnection & 4. Removes ALL event listeners
//     if (peerConnections.current.size > 0) {
//       console.log('🟡 [useWebRTC] Closing all PeerConnections');
//       peerConnections.current.forEach((pc, peerId) => {
//         pc.onicecandidate = null;
//         pc.ontrack = null;
//         pc.onconnectionstatechange = null;
//         pc.onnegotiationneeded = null;
//         pc.close();
//         console.log(`[useWebRTC] Closed PeerConnection for ${peerId}`);
//       });
//       peerConnections.current.clear();
//     }

//     // 7. Resets ALL state
//     console.log('🔵 [useWebRTC] Resetting all local state');
//     setLocalMediaStream(null);
//     setRemoteMediaStreams({});
//     setIsReady(false);
//     iceCandidateQueue.current = {};

//     // Reset promise for future calls
//     localMediaReadyPromise.current = new Promise(resolve => {
//       resolveLocalMediaReady.current = resolve;
//     });

//     console.log('✅ [useWebRTC] cleanupCall complete');
//   }, []);

//   const forceCleanup = useCallback(() => {
//     console.log('⚠️ FORCED CLEANUP INITIATED');
//     cleanupCall();
//   }, [cleanupCall]);

//   // Initiate call with all existing participants if initiator
//   useEffect(() => {
//     if (isReady && activeCall?.isInitiator && activeCall.participants) {
//       activeCall.participants.forEach(pId => {
//         const idStr = pId._id || pId;
//         if (idStr !== myUserId) {
//           createPeerConnection(idStr, true);
//         }
//       });
//     }
//   }, [isReady, activeCall?.isInitiator, activeCall?.participants, myUserId, createPeerConnection]);

//   // Clean up when call ends externally or internally
//   useEffect(() => {
//     if (!activeCall || activeCall.status === 'Ended' || activeCall.status === 'Rejected') {
//       cleanupCall();
//     }
//   }, [activeCall, cleanupCall]);

//   // 2. Called on component unmount
//   useEffect(() => {
//     return () => {
//       console.log('🗑️ [useWebRTC] Component unmounting, running cleanupCall');
//       cleanupCall();
//     };
//   }, [cleanupCall]);

//   return {
//     initWebRTC,
//     handleOffer,
//     handleAnswer,
//     handleIceCandidate,
//     handlePeerJoined,
//     toggleMute,
//     toggleVideo,
//     startScreenShare,
//     stopScreenShare,
//     cleanup: cleanupCall, // alias for backwards compatibility
//     cleanupCall,
//     forceCleanup,
//     isReady,
//     localMediaStream,
//     remoteMediaStreams
//   };
// }
import { useEffect, useRef, useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  setNetworkQuality,
  updateParticipantState,
  updateCallStatus,
  endCall as endCallRedux
} from '../store/slices/callSlice';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    {
      urls: 'turn:openrelay.metered.ca:80',
      username: 'openrelayproject',
      credential: 'openrelayproject'
    },
    {
      urls: 'turn:openrelay.metered.ca:443',
      username: 'openrelayproject',
      credential: 'openrelayproject'
    }
  ]
};

export function useWebRTC(socket, callId, myUserId) {
  const dispatch = useDispatch();
  const { devices, activeCall } = useSelector(state => state.call);

  const peerConnections = useRef(new Map());
  const localStream = useRef(null);
  const screenStreamRef = useRef(null);
  const timeoutRef = useRef(null);
  const isCleaningUp = useRef(false);
  const cleanupPromiseRef = useRef(null);
  const knownParticipantsRef = useRef([]);
  const negotiationInProgressRef = useRef(new Set());

  const [isReady, setIsReady] = useState(false);
  const [isCallActive, setIsCallActive] = useState(false);
  const [isInCall, setIsInCall] = useState(false);
  const [callStatus, setCallStatus] = useState('idle');
  const [localMediaStream, setLocalMediaStream] = useState(null);
  const [remoteMediaStreams, setRemoteMediaStreams] = useState({});

  const localMediaReadyPromise = useRef(null);
  const resolveLocalMediaReady = useRef(null);

  if (!localMediaReadyPromise.current) {
    localMediaReadyPromise.current = new Promise(resolve => {
      resolveLocalMediaReady.current = resolve;
    });
  }

  const initWebRTC = useCallback(async () => {
    try {
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
  }, [devices, activeCall]);

  // ✅ ASYNC CLEANUP - Returns a promise
  const cleanupCall = useCallback(() => {
    // If cleanup is already running, return existing promise
    if (cleanupPromiseRef.current) {
      console.log('[useWebRTC] Cleanup already in progress, returning existing promise');
      return cleanupPromiseRef.current;
    }

    console.log('[useWebRTC] ===== STARTING COMPLETE CLEANUP =====');
    isCleaningUp.current = true;

    cleanupPromiseRef.current = new Promise((resolve) => {
      try {
        // 1. Clear timeouts
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
          console.log('[useWebRTC] Cleared timeouts');
        }

        // 2. Stop screen share stream
        if (screenStreamRef.current) {
          console.log('[useWebRTC] Stopping screen share');
          screenStreamRef.current.getTracks().forEach(track => {
            track.stop();
            console.log('[useWebRTC] Stopped screen track:', track.kind);
          });
          screenStreamRef.current = null;
        }

        // 3. Stop ALL local media tracks
        if (localStream.current) {
          console.log('[useWebRTC] Stopping local media tracks');
          localStream.current.getTracks().forEach(track => {
            track.stop();
            console.log('[useWebRTC] Stopped track:', track.kind);
          });
          localStream.current = null;
          console.log('[useWebRTC] Local stream nullified');
        }

        // 4. Close ALL PeerConnections
        if (peerConnections.current.size > 0) {
          console.log('[useWebRTC] Closing PeerConnections, count:', peerConnections.current.size);

          const peerIds = Array.from(peerConnections.current.keys());

          peerIds.forEach(peerId => {
            try {
              const pc = peerConnections.current.get(peerId);
              if (pc) {
                pc.ontrack = null;
                pc.onicecandidate = null;
                pc.onconnectionstatechange = null;
                pc.oniceconnectionstatechange = null;
                pc.onsignalingstatechange = null;
                pc.onnegotiationneeded = null;
                pc.ondatachannel = null;

                pc.close();
                console.log('[useWebRTC] Closed PeerConnection for:', peerId);
                peerConnections.current.delete(peerId);
              }
            } catch (err) {
              console.error('[useWebRTC] Error closing PC for:', peerId, err);
            }
          });

          peerConnections.current.clear();
          console.log('[useWebRTC] All PeerConnections cleared');
        }

        // 5. Reset ALL state variables
        console.log('[useWebRTC] Resetting all state');
        setLocalMediaStream(null);
        setRemoteMediaStreams({});
        setIsReady(false);
        setIsCallActive(false);
        setIsInCall(false);
        setCallStatus('idle');

        // 6. Clear ICE candidate queue
        iceCandidateQueue.current = {};
        console.log('[useWebRTC] ICE queue cleared');

        // 7. Reset promise for future calls
        localMediaReadyPromise.current = new Promise(resolve => {
          resolveLocalMediaReady.current = resolve;
        });

        // 8. Dispatch Redux reset
        dispatch(endCallRedux());
        console.log('[useWebRTC] Dispatched endCall to Redux');

        isCleaningUp.current = false;
        console.log('[useWebRTC] ===== CLEANUP COMPLETE =====');

        // Resolve after a small delay to ensure all async operations complete
        setTimeout(() => {
          cleanupPromiseRef.current = null;
          resolve(true);
        }, 100);

      } catch (error) {
        console.error('[useWebRTC] Error during cleanup:', error);
        isCleaningUp.current = false;
        cleanupPromiseRef.current = null;
        resolve(false);
      }
    });

    return cleanupPromiseRef.current;
  }, [dispatch]);

  // ✅ Check if cleanup is complete
  const isCleanupComplete = useCallback(() => {
    return !isCleaningUp.current && !cleanupPromiseRef.current;
  }, []);

  // ✅ Wait for cleanup to complete
  const waitForCleanup = useCallback(async (maxWaitMs = 3000) => {
    console.log('[useWebRTC] Waiting for cleanup to complete...');
    const startTime = Date.now();

    while (isCleaningUp.current || cleanupPromiseRef.current) {
      if (Date.now() - startTime > maxWaitMs) {
        console.log('[useWebRTC] Cleanup wait timeout, forcing complete');
        break;
      }
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    console.log('[useWebRTC] Cleanup wait complete, isCleanup:', isCleanupComplete());
    return isCleanupComplete();
  }, [isCleanupComplete]);

  const replaceOutgoingVideoTrack = useCallback((track) => {
    if (!track) return;

    peerConnections.current.forEach(pc => {
      const senders = pc.getSenders();
      const videoSender = senders.find(s => s.track && s.track.kind === 'video');
      if (videoSender) {
        videoSender.replaceTrack(track).catch(console.error);
      } else if (localStream.current) {
        pc.addTrack(track, localStream.current);
      }
    });
  }, []);

  const syncVideoTrackToPeers = useCallback(() => {
    const activeTrack = screenStreamRef.current?.getVideoTracks()[0] || localStream.current?.getVideoTracks()[0];
    if (activeTrack) {
      replaceOutgoingVideoTrack(activeTrack);
    }
  }, [replaceOutgoingVideoTrack]);

  const ensureTrackOnAllPeers = useCallback((track) => {
    if (!track) return;

    peerConnections.current.forEach(pc => {
      const senders = pc.getSenders();
      const hasVideoSender = senders.some(s => s.track && s.track.kind === 'video');
      if (!hasVideoSender) {
        if (localStream.current) {
          pc.addTrack(track, localStream.current);
        }
      }
    });
  }, []);

  const scheduleNegotiation = useCallback(async (targetUserId, pc) => {
    if (!socket || !callId || pc.signalingState !== 'stable' || negotiationInProgressRef.current.has(targetUserId)) {
      return;
    }

    negotiationInProgressRef.current.add(targetUserId);
    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit('webrtc_offer', {
        targetUserId,
        callId,
        offer
      });
      console.log('[useWebRTC] Sent offer to:', targetUserId);
    } catch (error) {
      console.error('[useWebRTC] Failed to negotiate:', error);
    } finally {
      negotiationInProgressRef.current.delete(targetUserId);
    }
  }, [socket, callId]);

  // ✅ FIXED: Create peer connection with cleanup check
  const createPeerConnection = useCallback(async (targetUserId, isInitiator) => {
    console.log('[useWebRTC] Creating PeerConnection for:', targetUserId);

    // ✅ Wait for any ongoing cleanup to complete
    await waitForCleanup();

    // ✅ Force cleanup if still not clean
    if (peerConnections.current.has(targetUserId)) {
      const existingPC = peerConnections.current.get(targetUserId);
      console.log('[useWebRTC] Removing existing PC for:', targetUserId);

      try {
        existingPC.ontrack = null;
        existingPC.onicecandidate = null;
        existingPC.onconnectionstatechange = null;
        existingPC.close();
      } catch (err) {
        console.error('[useWebRTC] Error closing existing PC:', err);
      }
      peerConnections.current.delete(targetUserId);
    }

    const pc = new RTCPeerConnection(ICE_SERVERS);
    peerConnections.current.set(targetUserId, pc);

    if (localStream.current) {
      localStream.current.getAudioTracks().forEach(track => {
        pc.addTrack(track, localStream.current);
        console.log('[useWebRTC] Added track for:', targetUserId, track.kind);
      });

      const outgoingVideoTrack = screenStreamRef.current?.getVideoTracks()[0] || localStream.current.getVideoTracks()[0];
      if (outgoingVideoTrack) {
        pc.addTrack(outgoingVideoTrack, localStream.current);
        console.log('[useWebRTC] Added outgoing video track for:', targetUserId, outgoingVideoTrack.kind);
      }
    }

    pc.onnegotiationneeded = () => {
      void scheduleNegotiation(targetUserId, pc);
    };

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
      console.log('[useWebRTC] Connection state for', targetUserId, ':', state);
      dispatch(updateParticipantState({ userId: targetUserId, connectionState: state }));

      if (state === 'connected') {
        setIsInCall(true);
        setCallStatus('connected');
        dispatch(updateCallStatus('Connected'));
        dispatch(setNetworkQuality('Excellent'));
      }

      if (state === 'failed' || state === 'disconnected') {
        console.log('[useWebRTC] Connection state issue for:', targetUserId, state);
      }
    };

    pc.ontrack = (event) => {
      console.log('[useWebRTC] Received track from:', targetUserId);
      const incomingTracks = event.streams?.[0]?.getTracks?.() || [];

      if (!incomingTracks.length) return;

      setRemoteMediaStreams(prev => {
        const existingStream = prev[targetUserId] || new MediaStream();
        const nextStream = new MediaStream();

        existingStream.getTracks().forEach(track => {
          const isSameTrack = incomingTracks.some(incoming => incoming.id === track.id);
          if (!isSameTrack) {
            nextStream.addTrack(track);
          }
        });

        incomingTracks.forEach(track => {
          const sameKindTrack = nextStream.getTracks().find(existing => existing.kind === track.kind);
          if (sameKindTrack) {
            nextStream.removeTrack(sameKindTrack);
          }
          nextStream.addTrack(track);
        });

        return { ...prev, [targetUserId]: nextStream };
      });
    };

    if (isInitiator) {
      void scheduleNegotiation(targetUserId, pc);
    }

    return pc;
  }, [socket, callId, dispatch, waitForCleanup, scheduleNegotiation]);

  // ✅ FIXED: END CALL - Waits for cleanup to complete
  const endCall = useCallback(async () => {
    console.log('[useWebRTC] ===== END CALL CALLED =====');

    // Emit end event to server
    if (socket && callId) {
      socket.emit('call:end', { callId });
      console.log('[useWebRTC] Sent call:end for:', callId);
    }

    // Run cleanup and wait for it to complete
    await cleanupCall();

    // Wait a bit more to ensure everything is cleaned up
    await new Promise(resolve => setTimeout(resolve, 100));

    console.log('[useWebRTC] End call complete, cleanup done');
  }, [socket, callId, cleanupCall]);

  const getKnownParticipantIds = useCallback(() => {
    return (activeCall?.participants || [])
      .map(p => p?._id || p)
      .filter(Boolean)
      .filter(id => id !== myUserId);
  }, [activeCall?.participants, myUserId]);

  const ensurePeerConnections = useCallback(async (excludedIds = []) => {
    if (!isReady || !localStream.current) return;

    const participantIds = getKnownParticipantIds().filter(id => !excludedIds.includes(id) && !peerConnections.current.has(id));
    for (const participantId of participantIds) {
      await createPeerConnection(participantId, true);
    }
  }, [createPeerConnection, getKnownParticipantIds, isReady]);

  const handlePeerJoined = useCallback(async (targetUserId) => {
    if (!targetUserId || targetUserId === myUserId) {
      if (targetUserId === myUserId) {
        await ensurePeerConnections();
      }
      return;
    }

    console.log('[useWebRTC] Peer joined:', targetUserId);
    await localMediaReadyPromise.current;
    setIsCallActive(true);
    setCallStatus('ringing');
    await createPeerConnection(targetUserId, true);
    const activeTrack = screenStreamRef.current?.getVideoTracks()[0] || localStream.current?.getVideoTracks()[0];
    if (activeTrack) {
      ensureTrackOnAllPeers(activeTrack);
    }
    await ensurePeerConnections([targetUserId]);
  }, [createPeerConnection, ensurePeerConnections, ensureTrackOnAllPeers, myUserId]);

  const handleOffer = useCallback(async (offer, fromUserId) => {
    console.log('[useWebRTC] Received offer from:', fromUserId);
    await localMediaReadyPromise.current;
    const pc = await createPeerConnection(fromUserId, false);

    try {
      if (pc.signalingState !== 'stable') {
        console.warn('[useWebRTC] Ignoring offer in non-stable state:', pc.signalingState);
        return;
      }

      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      console.log('[useWebRTC] Remote description set');

      if (iceCandidateQueue.current[fromUserId]) {
        for (const candidate of iceCandidateQueue.current[fromUserId]) {
          await pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(console.error);
        }
        iceCandidateQueue.current[fromUserId] = [];
        console.log('[useWebRTC] Processed queued ICE candidates');
      }

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socket.emit('webrtc_answer', {
        targetUserId: fromUserId,
        callId,
        answer
      });
      console.log('[useWebRTC] Sent answer to:', fromUserId);
    } catch (err) {
      console.error('[useWebRTC] Failed to handle offer:', err);
    }
  }, [createPeerConnection, socket, callId]);

  const iceCandidateQueue = useRef({});

  const handleAnswer = useCallback(async (answer, fromUserId) => {
    console.log('[useWebRTC] Received answer from:', fromUserId);
    const pc = peerConnections.current.get(fromUserId);
    if (!pc) {
      console.warn('[useWebRTC] No PC for:', fromUserId);
      return;
    }
    try {
      if (pc.signalingState === 'have-local-offer' || pc.signalingState === 'have-remote-offer') {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
        console.log('[useWebRTC] Remote description set from answer');

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

  const handleIceCandidate = useCallback(async (candidate, fromUserId) => {
    const pc = peerConnections.current.get(fromUserId);
    try {
      if (pc && pc.remoteDescription) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } else {
        if (!iceCandidateQueue.current[fromUserId]) iceCandidateQueue.current[fromUserId] = [];
        iceCandidateQueue.current[fromUserId].push(candidate);
        if (!pc) console.warn('[useWebRTC] No PC yet for ICE candidate, queueing it for later:', fromUserId);
      }
    } catch (e) {
      console.error('[useWebRTC] Error adding ice candidate:', e);
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

      if (isEnabled && !videoTrack) {
        try {
          const vStream = await navigator.mediaDevices.getUserMedia({ video: true });
          videoTrack = vStream.getVideoTracks()[0];
          localStream.current.addTrack(videoTrack);
          setLocalMediaStream(new MediaStream(localStream.current.getTracks()));

          syncVideoTrackToPeers();
        } catch (e) {
          console.error('[useWebRTC] Failed to get video:', e);
          return;
        }
      } else if (videoTrack) {
        videoTrack.enabled = isEnabled;
        syncVideoTrackToPeers();
      }

      peerConnections.current.forEach((_, peerId) => {
        socket.emit('camera_toggle', { targetUserId: peerId, isEnabled });
      });
    }
  }, [socket, syncVideoTrackToPeers]);

  const startScreenShare = useCallback(async () => {
    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      screenStreamRef.current = displayStream;
      const screenTrack = displayStream.getVideoTracks()[0];

      peerConnections.current.forEach(pc => {
        const senders = pc.getSenders();
        const videoSender = senders.find(s => s.track && s.track.kind === 'video');
        if (videoSender) {
          videoSender.replaceTrack(screenTrack).then(() => {
            console.log('[useWebRTC] Screen track replaced, triggering renegotiation');
          }).catch(err => {
            console.error('[useWebRTC] Failed to replace track:', err);
            if (localStream.current && !senders.some(s => s.track === screenTrack)) {
              pc.addTrack(screenTrack, localStream.current);
            }
          });
        } else if (localStream.current) {
          pc.addTrack(screenTrack, localStream.current);
        }
      });

      // Trigger renegotiation for all peers after a brief delay
      await new Promise(resolve => setTimeout(resolve, 200));
      for (const [targetUserId, pc] of peerConnections.current.entries()) {
        if (pc.signalingState === 'stable') {
          void scheduleNegotiation(targetUserId, pc);
        }
      }

      peerConnections.current.forEach((_, peerId) => {
        socket.emit('screen_share_start', { targetUserId: peerId });
      });

      screenTrack.onended = () => {
        stopScreenShare();
      };

      return displayStream;
    } catch (e) {
      console.error('[useWebRTC] Failed to start screen share:', e);
      return null;
    }
  }, [socket, scheduleNegotiation]);

  const stopScreenShare = useCallback(() => {
    const videoTrack = localStream.current?.getVideoTracks()[0];

    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(t => t.stop());
      screenStreamRef.current = null;
    }

    peerConnections.current.forEach(pc => {
      const senders = pc.getSenders();
      const videoSender = senders.find(s => s.track && s.track.kind === 'video');
      if (videoSender && videoTrack) {
        videoSender.replaceTrack(videoTrack).then(() => {
          console.log('[useWebRTC] Camera track restored, triggering renegotiation');
        }).catch(err => {
          console.error('[useWebRTC] Failed to restore track:', err);
        });
      }
    });

    // Trigger renegotiation for all peers after a brief delay
    (async () => {
      await new Promise(resolve => setTimeout(resolve, 200));
      for (const [targetUserId, pc] of peerConnections.current.entries()) {
        if (pc.signalingState === 'stable') {
          void scheduleNegotiation(targetUserId, pc);
        }
      }
    })();

    peerConnections.current.forEach((_, peerId) => {
      socket.emit('screen_share_stop', { targetUserId: peerId });
    });
  }, [socket, scheduleNegotiation]);

  const forceCleanup = useCallback(async () => {
    console.log('[useWebRTC] FORCED CLEANUP INITIATED');
    await cleanupCall();
  }, [cleanupCall]);

  // Cleanup when call ends
  useEffect(() => {
    console.log('[useWebRTC] activeCall changed:', activeCall?.status);
    if (!activeCall || activeCall.status === 'Ended' || activeCall.status === 'Rejected' || activeCall.status === 'ended') {
      console.log('[useWebRTC] Call ended, running cleanup');
      cleanupCall();
    }
  }, [activeCall, cleanupCall]);

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      console.log('[useWebRTC] Component unmounting, running cleanup');
      cleanupCall();
    };
  }, [cleanupCall]);



  // Initiate calls if initiator
  useEffect(() => {
    if (isReady && activeCall?.participants) {
      knownParticipantsRef.current = getKnownParticipantIds();
      if (activeCall?.isInitiator) {
        console.log('[useWebRTC] Initiating calls to participants');
        activeCall.participants.forEach(async (pId) => {
          const idStr = pId._id || pId;
          if (idStr !== myUserId && !peerConnections.current.has(idStr)) {
            await createPeerConnection(idStr, true);
          }
        });
      } else {
        void ensurePeerConnections();
      }
    }
  }, [isReady, activeCall?.isInitiator, activeCall?.participants, myUserId, createPeerConnection, ensurePeerConnections, getKnownParticipantIds]);

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
    cleanup: cleanupCall,
    cleanupCall,
    forceCleanup,
    waitForCleanup,
    isCleanupComplete,
    isReady,
    isCallActive,
    isInCall,
    callStatus,
    localMediaStream,
    remoteMediaStreams
  };
}