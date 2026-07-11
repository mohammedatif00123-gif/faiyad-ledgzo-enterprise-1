import React from 'react';
import { Pin, X } from 'lucide-react';
import { useSelector, useDispatch } from 'react-redux';
import { removePinnedMessage } from '../../store/slices/chatSlice';
import api from '../../services/api';
import { motion, AnimatePresence } from 'framer-motion';

export function PinnedMessagesPanel({ conversationId }) {
  const dispatch = useDispatch();
  const { pinnedMessages } = useSelector(state => state.chat);
  const { user } = useSelector(state => state.auth);
  const pins = pinnedMessages[conversationId] || [];

  if (pins.length === 0) return null;

  const handleUnpin = async (messageId) => {
    try {
      await api.delete(`/messages/conversation/${conversationId}/messages/${messageId}/pin`);
      dispatch(removePinnedMessage({ conversationId, messageId }));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="bg-muted/20 border-b p-2 px-6 flex items-center gap-4 overflow-x-auto whitespace-nowrap scrollbar-hide shadow-sm z-10 relative">
      <div className="flex items-center text-xs font-semibold text-primary gap-1">
        <Pin className="w-3 h-3" /> Pinned
      </div>
      <div className="flex gap-2">
        <AnimatePresence>
          {pins.map(pin => (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              key={pin._id} 
              className="flex items-center gap-2 bg-background border px-3 py-1.5 rounded-full text-xs shadow-sm"
            >
              <span className="font-medium">{pin.message?.sender?.firstName}:</span>
              <span className="truncate max-w-[200px] text-muted-foreground">{pin.message?.content}</span>
              {(user.id === pin.pinnedBy || user.role === 'Admin') && (
                <button onClick={() => handleUnpin(pin.message._id)} className="ml-1 hover:text-destructive transition-colors">
                  <X className="w-3 h-3" />
                </button>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
