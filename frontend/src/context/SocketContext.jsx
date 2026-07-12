import React, { createContext, useContext, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { io } from 'socket.io-client';
import { toast } from 'sonner';
import { 
  addMessage, 
  setTyping,
  updateMessage
} from '../store/slices/chatSlice';
import { 
  setIncomingCall, 
  updateCallStatus, 
  endCall, 
  clearIncomingCall, 
  updateParticipantState 
} from '../store/slices/callSlice';
import { audioUtils } from '../utils/audioUtils';

const SocketContext = createContext();

export function useSocket() {
  return useContext(SocketContext);
}

export function SocketProvider({ children }) {
  const dispatch = useDispatch();
  const { accessToken, user } = useSelector(state => state.auth);
  const { activeConversation, conversations } = useSelector(state => state.chat);
  const [socket, setSocket] = useState(null);

  const activeConversationRef = React.useRef(activeConversation);
  
  useEffect(() => {
    activeConversationRef.current = activeConversation;
  }, [activeConversation]);

  useEffect(() => {
    if (!accessToken) return;

    const newSocket = io(import.meta.env.VITE_API_URL || 'http://localhost:5000', {
      auth: { token: `Bearer ${accessToken}` },
      withCredentials: true,
    });

    newSocket.on('connect', () => {
      console.log('Global socket connected:', newSocket.id);
    });

    newSocket.on('newMessage', (message) => {
      dispatch(addMessage({ conversationId: message.conversation, message }));
      
      if (message.sender._id !== user.id) {
        newSocket.emit('messageDelivered', { 
          conversationId: message.conversation, 
          messageId: message._id 
        });
      }

      if (message.sender._id !== user.id && message.conversation !== activeConversationRef.current) {
        
        // Mute check
        const conv = conversations.find(c => c._id === message.conversation);
        if (!conv?.isMuted) {
          audioUtils.playNotificationSound();
        }
        
        toast(message.sender.firstName + ' sent a message', {
          description: message.content.length > 30 ? message.content.substring(0, 30) + '...' : message.content,
        });

        if (Notification.permission === 'granted') {
          new Notification(`${message.sender.firstName} ${message.sender.lastName}`, {
            body: message.content,
            icon: message.sender.avatar || '/favicon.ico'
          });
        }
      }
    });

    newSocket.on('userTyping', ({ conversationId, userId, isTyping }) => {
      dispatch(setTyping({ conversationId, userId, isTyping }));
    });

    newSocket.on('message_status_update', ({ conversationId, messageId, status }) => {
      dispatch(updateMessage({
        conversationId,
        messageId,
        updates: { status }
      }));
    });

    newSocket.on('conversation_read', ({ conversationId, readBy }) => {
      // Dispatch an action or reuse updateMessage to mark all as read
      dispatch({ 
        type: 'chat/markConversationAsReadState', 
        payload: { conversationId, readBy } 
      });
    });

    newSocket.on('call_ringing', (data) => {
      audioUtils.playRingtone();
      dispatch(setIncomingCall(data));
    });

    newSocket.on('call_accept', () => {
      audioUtils.playConnectSound();
      dispatch(updateCallStatus('Connecting'));
    });

    newSocket.on('call_answered_elsewhere', () => {
      audioUtils.stopAll();
      dispatch(clearIncomingCall());
    });

    newSocket.on('call_reject', (data) => {
      audioUtils.stopAll();
      dispatch(updateCallStatus({ status: 'Rejected', callId: data?.callId }));
      setTimeout(() => dispatch(endCall(data?.callId)), 3000);
      toast.error('Call rejected');
    });

    newSocket.on('call_cancel', (data) => {
      audioUtils.stopAll();
      dispatch(clearIncomingCall());
      dispatch(endCall(data?.callId));
    });

    newSocket.on('call_end', (data) => {
      audioUtils.playDisconnectSound();
      dispatch(updateCallStatus({ status: 'Ended', callId: data?.callId }));
      setTimeout(() => dispatch(endCall(data?.callId)), 3000);
    });

    newSocket.on('participant_muted', (data) => {
      dispatch(updateParticipantState({ userId: data.from, muted: data.isMuted }));
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
      setSocket(null);
    };
  }, [accessToken, dispatch, user.id]);

  return (
    <SocketContext.Provider value={{ socket }}>
      {children}
    </SocketContext.Provider>
  );
}
