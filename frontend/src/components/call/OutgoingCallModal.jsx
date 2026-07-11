import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { PhoneOff } from 'lucide-react';
import { endCall } from '../../store/slices/callSlice';
import api from '../../services/api';
import { getAvatarUrl } from '../../utils/avatar';
import { motion } from 'framer-motion';

export function OutgoingCallModal({ socket }) {
  const dispatch = useDispatch();
  const { activeCall, participantStates } = useSelector(state => state.call);
  const { user } = useSelector(state => state.auth);
  
  const [targetDetails, setTargetDetails] = useState(null);

  // Determine target user id
  const targetUserId = activeCall?.participants?.find(p => p !== user.id);

  useEffect(() => {
    // Fetch target user details
    if (targetUserId) {
      api.get(`/chat/directory`)
        .then(res => {
          const u = res.data.data.find(emp => emp._id === targetUserId);
          if (u) setTargetDetails(u);
        })
        .catch(console.error);
    }
  }, [targetUserId]);

  if (!activeCall || activeCall.status !== 'Ringing' || !activeCall.isInitiator) return null;

  const handleCancel = async () => {
    try {
      if (activeCall.callId) {
        await api.post(`/calls/${activeCall.callId}/end`);
        socket.emit('call_cancel', { targetUserId, callId: activeCall.callId });
      }
    } catch (err) {
      console.error('Failed to cancel call', err);
    } finally {
      dispatch(endCall());
    }
  };

  return (
    <motion.div 
      drag
      dragMomentum={false}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className="fixed z-[100] w-64 h-64 rounded-full bg-slate-900 shadow-2xl flex flex-col items-center justify-center cursor-grab active:cursor-grabbing text-white border-2 border-slate-700/50"
      style={{ top: '80px', right: '40px', touchAction: 'none' }}
    >
      <div className="flex flex-col items-center pointer-events-none">
        <div className="relative mb-3">
          <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping" style={{ animationDuration: '2s' }} />
          <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-slate-800 z-10 bg-slate-800 flex items-center justify-center">
            {targetDetails?.avatar ? (
              <img src={getAvatarUrl(targetDetails.avatar)} alt="Target" className="w-full h-full object-cover" />
            ) : (
              <span className="text-2xl font-semibold text-slate-300">
                {targetDetails?.firstName?.charAt(0) || '?'}
              </span>
            )}
          </div>
        </div>

        <h3 className="text-lg font-semibold text-white mb-0.5">
          {targetDetails ? `${targetDetails.firstName}` : 'Calling...'}
        </h3>
        <p className="text-xs text-slate-400 mb-4">Initiating...</p>
      </div>

      <button 
        onClick={handleCancel}
        className="w-12 h-12 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center text-white shadow-[0_0_15px_rgba(239,68,68,0.4)] transition-all pointer-events-auto"
      >
        <PhoneOff className="w-5 h-5" />
      </button>

      {/* Outgoing Ringtone Audio Element */}
      <audio src="/sounds/calling.mp3" autoPlay loop className="hidden" />
    </motion.div>
  );
}
