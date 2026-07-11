import React, { useState, useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ChatHeader } from './ChatHeader';
import { MessageBubble } from './MessageBubble';
import { MessageInput } from './MessageInput';
import { ThreadDrawer } from './ThreadDrawer';
import { ChatContextMenu } from './ChatContextMenu';
import { PinnedMessagesPanel } from './PinnedMessagesPanel';
import { GroupInfoDrawer } from './GroupInfoDrawer';
import api from '../../services/api';
import { setMessages, setActiveThread } from '../../store/slices/chatSlice';

export function ChatArea({ socket }) {
  const dispatch = useDispatch();
  const { user } = useSelector(state => state.auth);
  const { conversations, activeConversation, messages, activeThread, typing: stateTyping = {} } = useSelector(state => state.chat);
  const parentRef = useRef(null);
  const messagesEndRef = useRef(null);

  const [contextMenu, setContextMenu] = useState(null);
  const [replyTo, setReplyTo] = useState(null);
  const [showInfo, setShowInfo] = useState(false);

  const conversation = conversations.find(c => c._id === activeConversation);
  const currentMessages = messages[activeConversation] || [];
  const convTyping = stateTyping[activeConversation] || {};
  const typingUsers = Object.keys(convTyping).filter(uid => convTyping[uid] && uid !== user.id);
  const isTyping = typingUsers.length > 0;

  const getTypingText = () => {
    if (typingUsers.length === 0) return '';
    if (conversation?.type === 'direct') return `${conversation.name} is typing...`;
    
    const names = typingUsers.map(uid => {
      const msg = currentMessages.find(m => m.sender?._id === uid);
      if (msg && msg.sender?.firstName) return msg.sender.firstName;
      return 'Someone';
    });
    
    const uniqueNames = [...new Set(names)];
    if (uniqueNames.length === 1) return `${uniqueNames[0]} is typing...`;
    if (uniqueNames.length === 2) return `${uniqueNames[0]} and ${uniqueNames[1]} are typing...`;
    return 'Several people are typing...';
  };

  useEffect(() => {
    if (activeConversation && !messages[activeConversation]) {
      api.get(`/messages/conversation/${activeConversation}`)
        .then(res => {
          dispatch(setMessages({ conversationId: activeConversation, messages: res.data.data }));
        })
        .catch(console.error);
    }
  }, [activeConversation, dispatch, messages]);

  useEffect(() => {
    if (socket && activeConversation) {
      socket.emit('joinRoom', activeConversation);
      return () => {
        socket.emit('leaveRoom', activeConversation);
      };
    }
  }, [socket, activeConversation]);

  const rowVirtualizer = useVirtualizer({
    count: currentMessages.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 100,
    overscan: 10,
  });

  useEffect(() => {
    if (rowVirtualizer.getTotalSize() > 0 && currentMessages.length > 0) {
      rowVirtualizer.scrollToIndex(currentMessages.length - 1, { align: 'end' });
    }
  }, [currentMessages.length, rowVirtualizer]);

  const handleSend = (payload) => {
    if (!socket || !activeConversation) return;

    // Optimistic UI Update
    const tempId = 'temp_' + Date.now();
    const optimisticMsg = {
      _id: tempId,
      conversation: activeConversation,
      content: payload.content,
      attachments: payload.attachments || [],
      messageType: payload.messageType || 'text',
      sender: user,
      createdAt: new Date().toISOString(),
      parentMessage: replyTo ? replyTo._id : null
    };

    dispatch(addMessage({ conversationId: activeConversation, message: optimisticMsg }));

    socket.emit('sendMessage', {
      conversationId: activeConversation,
      content: payload.content,
      attachments: payload.attachments || [],
      messageType: payload.messageType || 'text',
      parentMessage: replyTo ? replyTo._id : null
    });
    setReplyTo(null);
  };

  const handleContextMenu = (x, y, message) => {
    setContextMenu({ x, y, message });
  };

  const closeContextMenu = () => {
    setContextMenu(null);
  };

  const handleContextAction = async (action, message) => {
    if (action === 'reply') setReplyTo(message);
    if (action === 'thread') dispatch(setActiveThread(message._id));
    if (action === 'delete_me') {
      try { await api.delete(`/messages/${message._id}/me`); } catch (err) { console.error(err); }
    }
    if (action === 'delete_everyone') {
      try { await api.delete(`/messages/${message._id}/everyone`); } catch (err) { console.error(err); }
    }
    if (action === 'pin') {
      try { await api.post(`/messages/conversation/${activeConversation}/messages/${message._id}/pin`); } catch (err) { console.error(err); }
    }
    if (action === 'bookmark') {
      try { await api.post(`/messages/${message._id}/bookmarks`); } catch (err) { console.error(err); }
    }
  };

  if (!conversation) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground bg-muted/10 h-full">
        Select a conversation to start chatting
      </div>
    );
  }

  return (
    <div className="flex h-full w-full bg-background relative overflow-hidden" onClick={closeContextMenu}>
      <div className={`flex flex-col h-full transition-all duration-300 ${activeThread ? 'w-full sm:w-[calc(100%-24rem)]' : 'w-full'}`}>
        <ChatHeader conversation={conversation} onToggleInfo={() => setShowInfo(true)} socket={socket} />
        <PinnedMessagesPanel conversationId={activeConversation} />
        
        <div 
          ref={parentRef} 
          className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar"
        >
          <div
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
              width: '100%',
              position: 'relative',
            }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const msg = currentMessages[virtualRow.index];
              return (
                <div
                  key={msg._id}
                  data-index={virtualRow.index}
                  ref={rowVirtualizer.measureElement}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  <MessageBubble 
                    message={msg} 
                    isOwn={msg.sender?._id === user.id} 
                    onContextMenu={handleContextMenu}
                  />
                </div>
              );
            })}
          </div>
          
          {isTyping && (
            <div className="flex items-center gap-2 p-3 w-fit mt-2 rounded-2xl bg-muted/30 text-muted-foreground animate-in slide-in-from-bottom-2">
              <div className="flex space-x-1.5 p-1">
                <div className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <span className="text-xs font-medium italic">{getTypingText()}</span>
            </div>
          )}

          <div ref={messagesEndRef} className="h-4" />
        </div>

        <MessageInput 
          conversationId={activeConversation} 
          onSend={handleSend} 
          onTyping={(isTyping) => {
            if (socket && activeConversation) {
              socket.emit('typing', { conversationId: activeConversation, isTyping });
            }
          }}
          replyTo={replyTo} 
          onCancelReply={() => setReplyTo(null)}
        />
      </div>

      <ThreadDrawer socket={socket} />

      {contextMenu && (
        <ChatContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          message={contextMenu.message}
          onClose={closeContextMenu}
          onAction={handleContextAction}
          isOwn={contextMenu.message?.sender?._id === user.id}
          role={user.role}
        />
      )}

      <GroupInfoDrawer 
        conversation={conversation} 
        isOpen={showInfo} 
        onClose={() => setShowInfo(false)} 
      />
    </div>
  );
}
