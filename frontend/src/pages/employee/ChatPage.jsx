import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { io } from 'socket.io-client';
import api from '../../services/api';
import { setConversations, addMessage, setTyping } from '../../store/slices/chatSlice';
import { ChatLayout } from '../../components/chat/ChatLayout';
import { ChatSidebar } from '../../components/chat/ChatSidebar';
import { ChatArea } from '../../components/chat/ChatArea';
import { IncomingCallModal } from '../../components/call/IncomingCallModal';
import { OutgoingCallModal } from '../../components/call/OutgoingCallModal';
import { VideoCallPage } from '../../components/call/VideoCallPage';
import { AudioCallWidget } from '../../components/call/AudioCallWidget';
import { DeviceSettingsMenu } from '../../components/call/DeviceSettingsMenu';
import { setIncomingCall, updateCallStatus, endCall, clearIncomingCall, setActiveCall, updateParticipantState } from '../../store/slices/callSlice';
import { toast } from 'sonner';

export default function ChatPage() {
  const dispatch = useDispatch();
  const { accessToken, user } = useSelector(state => state.auth);
  const { activeConversation } = useSelector(state => state.chat);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    // Fetch initial conversations
    api.get('/chat/conversations')
      .then(res => {
        dispatch(setConversations(res.data.data));
      })
      .catch(console.error);
  }, [dispatch]);

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
      console.log('Chat socket connected');
    });

    newSocket.on('newMessage', (message) => {
      // The chatSlice now handles removing any temp messages when adding the real one.
      dispatch(addMessage({ conversationId: message.conversation, message }));
      
      // If message is from someone else and not in the active conversation, notify
      if (message.sender._id !== user.id && message.conversation !== activeConversationRef.current) {
        // Play notification sound
        try {
          const audio = new Audio('/sounds/notification.mp3');
          audio.play().catch(e => console.log('Audio play prevented by browser', e));
        } catch(e) {}
        
        // Show toast
        toast(message.sender.firstName + ' sent a message', {
          description: message.content.length > 30 ? message.content.substring(0, 30) + '...' : message.content,
        });

        // Browser Notification API
        if (Notification.permission === 'granted') {
          new Notification(`${message.sender.firstName} ${message.sender.lastName}`, {
            body: message.content,
            icon: message.sender.avatar || '/favicon.ico'
          });
        } else if (Notification.permission !== 'denied') {
          Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
              new Notification(`${message.sender.firstName} ${message.sender.lastName}`, {
                body: message.content,
                icon: message.sender.avatar || '/favicon.ico'
              });
            }
          });
        }
      }
    });

    newSocket.on('userTyping', ({ conversationId, userId, isTyping }) => {
      dispatch(setTyping({ conversationId, userId, isTyping }));
    });

    // --- Call Socket Events ---
    newSocket.on('call_ringing', (data) => {
      dispatch(setIncomingCall(data));
      // Ringtone handled in IncomingCallModal
    });

    newSocket.on('call_accept', (data) => {
      dispatch(updateCallStatus('Connecting'));
    });

    newSocket.on('call_answered_elsewhere', () => {
      dispatch(clearIncomingCall());
    });

    newSocket.on('call_reject', () => {
      dispatch(updateCallStatus('Rejected'));
      setTimeout(() => dispatch(endCall()), 3000);
      toast.error('Call rejected');
    });

    newSocket.on('call_cancel', () => {
      dispatch(clearIncomingCall());
      dispatch(endCall());
    });

    newSocket.on('call_end', () => {
      dispatch(updateCallStatus('Ended'));
      setTimeout(() => dispatch(endCall()), 3000);
    });

    newSocket.on('participant_muted', (data) => {
      dispatch(updateParticipantState({ userId: data.from, muted: data.isMuted }));
    });

    // Note: WebRTC peer connection events (webrtc_offer, webrtc_answer, webrtc_ice_candidate)
    // are not handled directly in Redux because they need access to the RTCPeerConnection instance.
    // They should ideally be listened to in VoiceCallPage.jsx.

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [accessToken, dispatch, user.id]);

  return (
    <div className="h-[calc(100vh-6rem)] relative">
      <ChatLayout 
        isConversationActive={!!activeConversation}
        sidebar={<ChatSidebar socket={socket} />} 
        area={<ChatArea socket={socket} />} 
      />
      
      {/* Call Modals and Overlays */}
      <IncomingCallModal socket={socket} />
      <OutgoingCallModal socket={socket} />
      <VideoCallPage socket={socket} />
      <AudioCallWidget socket={socket} />
    </div>
  );
}
