import { useState, useRef, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { updateParticipantState } from '../store/slices/callSlice';

export function useTrackManager(socket, callId) {
  const dispatch = useDispatch();
  const { devices, activeCall } = useSelector(state => state.call);

  const localStream = useRef(null);
  const screenStreamRef = useRef(null);
  
  const [localMediaStream, setLocalMediaStream] = useState(null);
  const [isMediaReady, setIsMediaReady] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  // Initialize initial media tracks based on call type
  const initLocalMedia = useCallback(async () => {
    if (localStream.current) return localStream.current;

    try {
      const isVideoCall = activeCall?.callType === 'video' || activeCall?.callType === 'meeting';
      
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: devices.audioInput === 'default' ? undefined : { exact: devices.audioInput },
          echoCancellation: devices.echoCancellation,
          noiseSuppression: devices.noiseSuppression,
        },
        video: isVideoCall ? { facingMode: 'user' } : false
      });

      // Apply initial settings (e.g. from pre-join screen)
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
      setIsMediaReady(true);
      return stream;
    } catch (err) {
      console.error('[TrackManager] Failed to get local media:', err);
      return null;
    }
  }, [devices, activeCall]);

  const toggleAudio = useCallback((isMuted) => {
    if (localStream.current) {
      localStream.current.getAudioTracks().forEach(track => {
        track.enabled = !isMuted; // true = unmuted, false = muted
      });
      // Emit to others so they can update UI
      if (socket) {
        // Find a way to broadcast this, or just let WebRTC handle silence.
        // Actually, we need UI updates for "muted" icon
      }
    }
  }, [socket]);

  // Add or remove video track dynamically
  const toggleVideo = useCallback(async (isEnabled, peerConnections) => {
    if (!localStream.current) return;
    
    let videoTrack = localStream.current.getVideoTracks()[0];

    if (isEnabled) {
      if (!videoTrack) {
        // It was a voice call, we need to acquire camera
        try {
          const vStream = await navigator.mediaDevices.getUserMedia({ video: true });
          videoTrack = vStream.getVideoTracks()[0];
          localStream.current.addTrack(videoTrack);
          
          // Force React state update
          setLocalMediaStream(new MediaStream(localStream.current.getTracks()));

          // Add to all existing peer connections
          peerConnections.current.forEach(pc => {
            pc.addTrack(videoTrack, localStream.current);
          });
        } catch (e) {
          console.error('[TrackManager] Failed to add video track:', e);
          return false;
        }
      } else {
        // Track exists, just enable it
        videoTrack.enabled = true;
      }
    } else {
      if (videoTrack) {
        // Track exists, just disable it
        videoTrack.enabled = false;
        // Optionally completely remove it:
        // videoTrack.stop();
        // localStream.current.removeTrack(videoTrack);
        // peerConnections.current.forEach(pc => {
        //   const sender = pc.getSenders().find(s => s.track === videoTrack);
        //   if (sender) pc.removeTrack(sender);
        // });
        // setLocalMediaStream(new MediaStream(localStream.current.getTracks()));
      }
    }
    return true;
  }, []);

  const startScreenShare = useCallback(async (peerConnections) => {
    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      screenStreamRef.current = displayStream;
      const screenTrack = displayStream.getVideoTracks()[0];
      
      setIsScreenSharing(true);

      // Add to peer connections
      peerConnections.current.forEach(pc => {
        const senders = pc.getSenders();
        const videoSender = senders.find(s => s.track && s.track.kind === 'video');
        
        if (videoSender) {
          // If already transmitting video, simply replace the track (no renegotiation needed)
          videoSender.replaceTrack(screenTrack);
        } else {
          // Voice call: add new track (triggers renegotiation)
          pc.addTrack(screenTrack, localStream.current);
        }
      });

      // Handle user stopping screen share via browser UI (e.g. Chrome's "Stop sharing" button)
      screenTrack.onended = () => {
        stopScreenShare(peerConnections);
      };

      return displayStream;
    } catch (e) {
      console.error('[TrackManager] Failed to start screen share', e);
      return null;
    }
  }, []);

  const stopScreenShare = useCallback((peerConnections) => {
    if (!screenStreamRef.current) return;
    
    // Stop the screen track
    screenStreamRef.current.getTracks().forEach(t => t.stop());
    screenStreamRef.current = null;
    setIsScreenSharing(false);

    const cameraTrack = localStream.current?.getVideoTracks()[0];

    peerConnections.current.forEach(pc => {
      const senders = pc.getSenders();
      const videoSender = senders.find(s => s.track && s.track.kind === 'video');
      
      if (videoSender) {
        if (cameraTrack) {
          // We had a camera before, restore it
          videoSender.replaceTrack(cameraTrack).catch(e => console.error(e));
        } else {
          // It was a voice call, remove the screen track completely (triggers renegotiation)
          pc.removeTrack(videoSender);
        }
      }
    });
  }, []);

  const cleanupTracks = useCallback(() => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(t => t.stop());
      screenStreamRef.current = null;
    }
    if (localStream.current) {
      localStream.current.getTracks().forEach(t => t.stop());
      localStream.current = null;
    }
    setLocalMediaStream(null);
    setIsMediaReady(false);
    setIsScreenSharing(false);
  }, []);

  return {
    localStream,
    localMediaStream,
    isMediaReady,
    isScreenSharing,
    initLocalMedia,
    toggleAudio,
    toggleVideo,
    startScreenShare,
    stopScreenShare,
    cleanupTracks
  };
}
