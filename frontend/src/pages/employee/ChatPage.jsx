import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import api from '../../services/api';
import { setConversations } from '../../store/slices/chatSlice';
import { ChatLayout } from '../../components/chat/ChatLayout';
import { ChatSidebar } from '../../components/chat/ChatSidebar';
import { ChatArea } from '../../components/chat/ChatArea';
import { useSocket } from '../../context/SocketContext';

export default function ChatPage() {
  const dispatch = useDispatch();
  const { activeConversation } = useSelector(state => state.chat);
  const { socket } = useSocket();

  useEffect(() => {
    // Fetch initial conversations
    api.get('/chat/conversations')
      .then(res => {
        dispatch(setConversations(res.data.data));
      })
      .catch(console.error);
  }, [dispatch]);

  return (
    <div className="h-full relative">
      <ChatLayout 
        isConversationActive={!!activeConversation}
        sidebar={<ChatSidebar socket={socket} />} 
        area={<ChatArea socket={socket} />} 
      />
    </div>
  );
}
