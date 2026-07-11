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
  const user = useSelector(state => state.auth.user);
  const [showPreJoin, setShowPreJoin] = useState(false);

  useEffect(() => {
    if (isCallModalOpen && navigator.vibrate) {
      // Vibrate pattern: 1s on, 1s off
      const interval = setInterval(() => {
        navigator.vibrate(1000);
      }, 2000);
      return () => {
        clearInterval(interval);
        navigator.vibrate(0);
      };
    }
  }, [isCallModalOpen]);

  if (!isCallModalOpen || !incomingCall) return null;

  const { callerDetails, callId } = incomingCall;

  const executeAccept = async (initialSettings = {}) => {
    try {
      await api.post(`/calls/${callId}/accept`);
      socket.emit('call_accept', { targetUserId: incomingCall.from, callId });
      
      dispatch(setActiveCall({
        callId,
        conversationId: incomingCall.conversationId,
        status: 'Connecting',
        participants: [incomingCall.from],
        isInitiator: false,
        callType: incomingCall.callType,
        initialSettings
      }));
    } catch (err) {
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
        className="fixed z-[100] w-72 rounded-[2rem] bg-slate-900 shadow-2xl flex flex-col items-center justify-center cursor-grab active:cursor-grabbing text-white border-2 border-slate-700/50 p-5"
        style={{ top: '80px', right: '40px', touchAction: 'none' }}
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

          <h3 className="text-lg font-semibold text-white mb-0.5 truncate w-full text-center px-2">
            {callerDetails?.firstName} {callerDetails?.lastName}
          </h3>
          <p className="text-xs text-slate-400 mb-5">
            Incoming {incomingCall.callType === 'video' ? 'Video' : 'Voice'} Call...
          </p>
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
      
      {/* Ringtone Audio Element */}
      <audio src="/sounds/ringtone.mp3" autoPlay loop className="hidden" />

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
