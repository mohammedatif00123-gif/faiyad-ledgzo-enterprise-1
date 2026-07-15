import React, { createContext, useContext, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { io } from 'socket.io-client';
import { toast } from 'sonner';
import {
  addMessage,
  setTyping,
  updateMessage,
  updatePartnerStatus,
  markMessagesDeleted
} from '../store/slices/chatSlice';
import {
  setIncomingCall,
  updateCallStatus,
  endCall,
  clearIncomingCall,
  updateParticipantState
} from '../store/slices/callSlice';
import { audioUtils } from '../utils/audioUtils';
import { useE2EE } from './E2EEContext';

const SocketContext = createContext();

export function useSocket() {
  return useContext(SocketContext);
}

export function SocketProvider({ children }) {
  const dispatch = useDispatch();
  const { accessToken, user } = useSelector(state => state.auth);
  const { activeConversation, conversations } = useSelector(state => state.chat);
  const { decryptDirectMessage, decryptGroupMessage, isReady: isE2EEReady } = useE2EE();
  const [socket, setSocket] = useState(null);

  const activeConversationRef = React.useRef(activeConversation);

  useEffect(() => {
    activeConversationRef.current = activeConversation;
  }, [activeConversation]);

  useEffect(() => {
    if (!accessToken || !user) return;

    const socketUrl = import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_URL || 'http://localhost:5000';
    const newSocket = io(socketUrl, {
      auth: { token: accessToken.startsWith('Bearer ') ? accessToken : `Bearer ${accessToken}` },
      withCredentials: true,
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    newSocket.on('connect_error', (err) => {
      console.error('Socket connect_error:', err?.message || err);
    });

    newSocket.on('connect', () => {
      console.log('Global socket connected:', newSocket.id);
    });

    newSocket.on('newMessage', async (message) => {
      let decryptedContent = message.content;
      
      // Attempt decryption if encrypted
      if (message.isEncrypted && message.iv && isE2EEReady) {
        try {
          const senderId = typeof message.sender === 'object' ? (message.sender._id || message.sender.id) : message.sender;
          const currentUserId = user?._id || user?.id;
          
          if (senderId !== currentUserId) {
             const conv = conversations.find(c => c._id === message.conversation);
             if (conv?.type === 'direct') {
               decryptedContent = await decryptDirectMessage(message.content, message.iv, senderId);
             } else if (conv?.type === 'channel' || conv?.type === 'group') {
               decryptedContent = await decryptGroupMessage(message.content, message.iv, message.conversation);
             }
             message.content = decryptedContent;
          }
        } catch (err) {
          console.error('[E2EE] Failed to decrypt incoming message:', err);
          message.content = '🔒 [Encrypted Message - Decryption Failed]';
        }
      }

      dispatch(addMessage({ conversationId: message.conversation, message }));

      const currentUserId = user?._id || user?.id;

      if (message.sender._id !== currentUserId) {
        newSocket.emit('messageDelivered', {
          conversationId: message.conversation,
          messageId: message._id
        });
      }

      if (message.sender._id !== currentUserId && message.conversation !== activeConversationRef.current) {

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

    newSocket.on('message_deleted', ({ conversationId, messageId }) => {
      if (!conversationId || !messageId) return;
      dispatch(markMessagesDeleted({ conversationId, messageIds: [messageId] }));
    });

    newSocket.on('messages_deleted_bulk', ({ conversationId, messageIds }) => {
      if (!conversationId || !Array.isArray(messageIds)) return;
      dispatch(markMessagesDeleted({ conversationId, messageIds }));
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

    newSocket.on('user_status_changed', ({ userId, presenceStatus, awayReason }) => {
      if (userId === user.id) {
        // Only import updateUser if we don't already have it
        import('../store/slices/authSlice').then(({ updateUser }) => {
          dispatch(updateUser({ presenceStatus }));
        });
      }
      // Update chat directory/colleagues
      dispatch(updatePartnerStatus({ userId, presenceStatus, awayReason }));
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
      setSocket(null);
    };
  }, [accessToken, dispatch, user?._id, user?.id]);

  return (
    <SocketContext.Provider value={{ socket }}>
      {children}
    </SocketContext.Provider>
  );
}
