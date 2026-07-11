import React, { useEffect, useState, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { X } from 'lucide-react';
import { setActiveThread, setThreadMessages } from '../../store/slices/chatSlice';
import { MessageBubble } from './MessageBubble';
import api from '../../services/api';
import { motion, AnimatePresence } from 'framer-motion';

export function ThreadDrawer({ socket }) {
  const dispatch = useDispatch();
  const { activeThread, threadMessages, messages, activeConversation } = useSelector(state => state.chat);
  const { user } = useSelector(state => state.auth);
  const messagesEndRef = useRef(null);

  const [input, setInput] = useState('');

  const currentMessages = threadMessages[activeThread] || [];
  
  // Find the root message from the main feed
  const rootMessage = messages[activeConversation]?.find(m => m._id === activeThread);

  useEffect(() => {
    if (activeThread && !threadMessages[activeThread]) {
      api.get(`/messages/thread/${activeThread}`)
        .then(res => {
          dispatch(setThreadMessages({ threadRootId: activeThread, messages: res.data.data }));
        })
        .catch(console.error);
    }
  }, [activeThread, dispatch, threadMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentMessages]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!input.trim() || !activeThread || !socket) return;
    
    socket.emit('sendMessage', {
      conversationId: activeConversation,
      content: input,
      threadRoot: activeThread,
      parentMessage: activeThread
    });
    setInput('');
  };

  return (
    <AnimatePresence>
      {activeThread && (
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="absolute right-0 top-0 h-full w-full sm:w-96 bg-card border-l flex flex-col z-20 shadow-xl"
        >
          <div className="flex items-center justify-between p-4 border-b">
            <h3 className="font-semibold text-lg">Thread</h3>
            <button onClick={() => dispatch(setActiveThread(null))} className="p-1 hover:bg-muted rounded-full">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {rootMessage && (
              <div className="border-b pb-4 mb-4">
                <MessageBubble message={rootMessage} isOwn={rootMessage.sender?._id === user.id} isRoot />
              </div>
            )}
            
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xs font-semibold text-muted-foreground">{currentMessages.length} replies</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            {currentMessages.map(msg => (
              <MessageBubble key={msg._id} message={msg} isOwn={msg.sender?._id === user.id} />
            ))}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 border-t bg-background">
            <form onSubmit={handleSend} className="flex flex-col gap-2 bg-muted/30 border rounded-xl p-2 focus-within:ring-1 focus-within:ring-primary shadow-sm">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Reply to thread..."
                className="w-full bg-transparent border-0 focus:ring-0 text-sm resize-none h-16"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend(e);
                  }
                }}
              />
              <div className="flex justify-end">
                <button type="submit" disabled={!input.trim()} className="bg-primary text-primary-foreground px-4 py-1.5 rounded-lg text-sm disabled:opacity-50 hover:bg-primary/90 transition-colors">
                  Reply
                </button>
              </div>
            </form>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
