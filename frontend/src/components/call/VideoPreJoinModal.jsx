import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Mic, MicOff, Video, VideoOff } from 'lucide-react';
import { createPortal } from 'react-dom';
import { getAvatarUrl } from '../../utils/avatar';

export function VideoPreJoinModal({ user, onJoin, onCancel, callType }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [isVideoEnabled, setIsVideoEnabled] = useState(callType !== 'screen_share');
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const initPreview = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: callType !== 'screen_share',
          audio: true
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error('Error accessing media devices.', err);
        setError('Could not access camera/microphone. Please check permissions.');
        setIsVideoEnabled(false);
        setIsAudioEnabled(false);
      }
    };
    initPreview();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, [callType]);

  const toggleVideo = () => {
    if (streamRef.current) {
      const videoTrack = streamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !isVideoEnabled;
        setIsVideoEnabled(!isVideoEnabled);
      }
    }
  };

  const toggleAudio = () => {
    if (streamRef.current) {
      const audioTrack = streamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !isAudioEnabled;
        setIsAudioEnabled(!isAudioEnabled);
      }
    }
  };

  const handleJoin = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    // Add a short delay to allow the browser to release the camera lock
    setTimeout(() => {
      onJoin({ isMuted: !isAudioEnabled, isVideoEnabled });
    }, 300);
  };

  const handleCancel = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    onCancel();
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-slate-900 rounded-2xl overflow-hidden max-w-3xl w-full flex flex-col md:flex-row border border-slate-700 shadow-2xl"
      >
        {/* Preview Area */}
        <div className="flex-1 bg-black relative min-h-[300px] md:min-h-[400px] flex items-center justify-center">
          {isVideoEnabled ? (
            <video 
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover transform scale-x-[-1]"
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-slate-400">
              <div className="w-24 h-24 rounded-full bg-slate-800 flex items-center justify-center overflow-hidden border-2 border-slate-700 mb-4">
                {user?.avatar ? (
                  <img src={getAvatarUrl(user.avatar)} alt="You" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-3xl font-semibold text-slate-300">
                    {user?.firstName?.charAt(0) || '?'}
                  </span>
                )}
              </div>
              <p>Camera is off</p>
            </div>
          )}

          {/* Quick toggles overlay */}
          <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-4">
            <button 
              onClick={toggleAudio}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${isAudioEnabled ? 'bg-slate-700/80 hover:bg-slate-600 text-white' : 'bg-red-500 hover:bg-red-600 text-white'}`}
            >
              {isAudioEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
            </button>
            {callType !== 'screen_share' && (
              <button 
                onClick={toggleVideo}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${isVideoEnabled ? 'bg-slate-700/80 hover:bg-slate-600 text-white' : 'bg-red-500 hover:bg-red-600 text-white'}`}
              >
                {isVideoEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
              </button>
            )}
          </div>
        </div>

        {/* Action Area */}
        <div className="w-full md:w-80 bg-slate-900 p-8 flex flex-col justify-center">
          <h2 className="text-2xl font-semibold text-white mb-2">Ready to join?</h2>
          {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
          <p className="text-slate-400 text-sm mb-8">
            Choose your audio and video settings before joining the call.
          </p>

          <div className="flex flex-col gap-3">
            <button 
              onClick={handleJoin}
              className="w-full py-3 px-4 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl transition-colors"
            >
              Join Now
            </button>
            <button 
              onClick={handleCancel}
              className="w-full py-3 px-4 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </motion.div>
    </div>,
    document.body
  );
}
