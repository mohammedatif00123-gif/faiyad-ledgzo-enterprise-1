import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Phone, PhoneOff, Video } from 'lucide-react';
import { clearIncomingCall, setActiveCall } from '../../store/slices/callSlice';
import api from '../../services/api';
import { getAvatarUrl } from '../../utils/avatar';
import { motion } from 'framer-motion';
import { VideoPreJoinModal } from './VideoPreJoinModal';

export function IncomingCallModal({ socket }) {
  const dispatch = useDispatch();
  const { incomingCall, isCallModalOpen } = useSelector(state => state.call);
  const { conversations } = useSelector(state => state.chat);
  const user = useSelector(state => state.auth.user);
  const [showPreJoin, setShowPreJoin] = useState(false);

  useEffect(() => {
    let audioCtx;
    let oscillator;
    let gainNode;
    let intervalId;

    if (isCallModalOpen) {
      if (navigator.vibrate) {
        intervalId = setInterval(() => {
          navigator.vibrate(1000);
        }, 2000);
      }

      // Simple Web Audio API Ringtone
      try {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        oscillator = audioCtx.createOscillator();
        gainNode = audioCtx.createGain();
        
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(440, audioCtx.currentTime); // A4
        
        // Pulse volume
        gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.5, audioCtx.currentTime + 0.1);
        gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.5);
        
        setInterval(() => {
          if (audioCtx.state === 'running') {
            gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
            gainNode.gain.linearRampToValueAtTime(0.5, audioCtx.currentTime + 0.1);
            gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.5);
            
            setTimeout(() => {
              gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
              gainNode.gain.linearRampToValueAtTime(0.5, audioCtx.currentTime + 0.1);
              gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.5);
            }, 600);
          }
        }, 2000);

        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        oscillator.start();
      } catch (e) {
        console.log("AudioContext not supported or blocked");
      }
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
      if (navigator.vibrate) navigator.vibrate(0);
      if (oscillator) {
        try { oscillator.stop(); oscillator.disconnect(); } catch(e){}
      }
      if (audioCtx) {
        try { audioCtx.close(); } catch(e){}
      }
    };
  }, [isCallModalOpen]);

  if (!isCallModalOpen || !incomingCall) return null;

  const { callerDetails, callId, conversationId } = incomingCall;
  const conversation = conversations.find(c => c._id === conversationId);
  const isGroupCall = conversation?.type === 'channel';

  const executeAccept = async (initialSettings = {}) => {
    try {
      const { data } = await api.post(`/calls/${callId}/accept`);
      const sessionParticipants = data?.callSession?.participants || [incomingCall.from];
      const normalizedParticipants = sessionParticipants
        .map(p => typeof p === 'string' ? p : p?._id || p)
        .filter(Boolean);

      socket.emit('call_accept', { targetUserId: incomingCall.from, callId });

      dispatch(setActiveCall({
        callId,
        conversationId: incomingCall.conversationId,
        status: 'Connecting',
        participants: normalizedParticipants,
        isInitiator: false,
        callType: incomingCall.callType,
        initialSettings
      }));
      dispatch(clearIncomingCall());
    } catch (err) {
      const message = err?.response?.data?.message || '';
      const isAlreadyJoined = err?.response?.status === 400 && /already|connected|accept/i.test(message);

      if (isAlreadyJoined) {
        dispatch(setActiveCall({
          callId,
          conversationId: incomingCall.conversationId,
          status: 'Connecting',
          participants: [incomingCall.from],
          isInitiator: false,
          callType: incomingCall.callType,
          initialSettings
        }));
        dispatch(clearIncomingCall());
        return;
      }

      console.error('Failed to accept call', err);
      dispatch(clearIncomingCall());
    }
  };

  const handleAccept = async () => {
    if (incomingCall.callType === 'video' || incomingCall.callType === 'screen_share') {
      setShowPreJoin(true);
    } else {
      await executeAccept();
    }
  };

  const handlePreJoin = (settings) => {
    setShowPreJoin(false);
    executeAccept(settings);
  };

  const handleReject = async () => {
    try {
      await api.post(`/calls/${callId}/reject`);
      socket.emit('call_reject', { targetUserId: incomingCall.from, callId });
    } catch (err) {
      console.error('Failed to reject call', err);
    } finally {
      dispatch(clearIncomingCall());
    }
  };

  return (
    <>
      <motion.div 
        drag
        dragMomentum={false}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="fixed z-[100] w-[90%] max-w-[280px] sm:w-72 rounded-[2rem] bg-slate-900 shadow-2xl flex flex-col items-center justify-center cursor-grab active:cursor-grabbing text-white border-2 border-slate-700/50 p-5 top-4 right-1/2 translate-x-1/2 sm:translate-x-0 sm:right-10 sm:top-20"
        style={{ touchAction: 'none' }}
      >
        <div className="flex flex-col items-center pointer-events-none w-full">
          {/* Pulsing Avatar */}
          <div className="relative mb-3">
            <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping" style={{ animationDuration: '2s' }} />
            <div className="absolute inset-[-6px] bg-primary/10 rounded-full animate-ping" style={{ animationDuration: '2s', animationDelay: '0.5s' }} />
            <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-slate-800 z-10 bg-slate-800 flex items-center justify-center">
              {callerDetails?.avatar ? (
                <img src={getAvatarUrl(callerDetails.avatar)} alt="Caller" className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl font-semibold text-slate-300">
                  {callerDetails?.firstName?.charAt(0) || '?'}
                </span>
              )}
            </div>
          </div>

          <div className="text-center w-full px-2 mb-5">
            <h3 className="text-lg font-bold text-white truncate max-w-full">
              {isGroupCall ? conversation?.name : `${callerDetails?.firstName} ${callerDetails?.lastName}`}
            </h3>
            <p className="text-xs text-slate-300 flex items-center justify-center gap-1 mt-1 font-medium">
              {incomingCall.callType === 'video' ? <Video className="w-3.5 h-3.5"/> : <Phone className="w-3.5 h-3.5"/>}
              {incomingCall.callType === 'video' ? 'Incoming video call' : 'Incoming voice call'}
            </p>
            {isGroupCall && (
              <p className="text-[10px] text-slate-400 mt-1 truncate">
                from {callerDetails?.firstName} {callerDetails?.lastName}
              </p>
            )}
          </div>
        </div>

        <div className="flex w-full justify-center gap-6 px-4 pointer-events-auto">
          <button 
            onClick={handleReject}
            className="flex flex-col items-center gap-1.5 group"
          >
            <div className="w-12 h-12 rounded-full bg-slate-800 text-red-400 flex items-center justify-center group-hover:bg-red-500 group-hover:text-white transition-all duration-300">
              <PhoneOff className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-medium text-slate-400 group-hover:text-red-400 transition-colors">Decline</span>
          </button>

          <button 
            onClick={handleAccept}
            className="flex flex-col items-center gap-1.5 group"
          >
            <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center text-white shadow-[0_0_15px_rgba(34,197,94,0.4)] group-hover:shadow-[0_0_25px_rgba(34,197,94,0.6)] group-hover:scale-110 transition-all duration-300">
              {incomingCall.callType === 'video' ? (
                <Video className="w-5 h-5 animate-pulse" />
              ) : (
                <Phone className="w-5 h-5 animate-pulse" />
              )}
            </div>
            <span className="text-[10px] font-medium text-green-500">Accept</span>
          </button>
        </div>
      </motion.div>

      {showPreJoin && (
        <VideoPreJoinModal 
          user={user}
          callType={incomingCall.callType} 
          onJoin={handlePreJoin} 
          onCancel={() => setShowPreJoin(false)} 
        />
      )}
    </>
  );
}
