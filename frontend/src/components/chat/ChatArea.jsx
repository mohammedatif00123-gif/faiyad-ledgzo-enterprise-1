import React, { useState, useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ChatHeader } from './ChatHeader';
import { MessageBubble } from './MessageBubble';
import { SystemMessage } from './SystemMessage';
import { MessageInput } from './MessageInput';
import { ThreadDrawer } from './ThreadDrawer';
import { ChatContextMenu } from './ChatContextMenu';
import { PinnedMessagesPanel } from './PinnedMessagesPanel';
import { GroupInfoDrawer } from './GroupInfoDrawer';
import { DayHeader } from './DayHeader';
import { DeleteModal } from './DeleteModal';
import { ForwardModal } from './ForwardModal';
import { groupMessagesByDay } from '../../utils/messageUtils';
import api from '../../services/api';
import { setMessages, setActiveThread, addMessage, removeMessagesBulk } from '../../store/slices/chatSlice';
import { X, Search, Trash2, Forward as ForwardIcon, Pin } from 'lucide-react';

export function ChatArea({ socket }) {
  const dispatch = useDispatch();
  const { user } = useSelector(state => state.auth);
  const { conversations, activeConversation, messages, activeThread, typing: stateTyping = {} } = useSelector(state => state.chat);
  const parentRef = useRef(null);
  const messagesEndRef = useRef(null);

  const [contextMenu, setContextMenu] = useState(null);
  const [replyTo, setReplyTo] = useState(null);
  const [showInfo, setShowInfo] = useState(false);

  // Selection & Search State
  const [selectionMode, setSelectionMode] = useState(null); // 'delete_me', 'delete_everyone', 'forward', 'pin'
  const [selectedMessages, setSelectedMessages] = useState([]);
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showForwardModal, setShowForwardModal] = useState(false);

  const conversation = conversations.find(c => c._id === activeConversation);
  const currentMessages = messages[activeConversation] || [];
  
  // Filter messages if search is active
  const displayedMessages = isSearchActive && searchQuery
    ? currentMessages.filter(m => m.content?.toLowerCase().includes(searchQuery.toLowerCase()))
    : currentMessages;

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
    // Reset selection & search when changing chats
    setSelectionMode(null);
    setSelectedMessages([]);
    setIsSearchActive(false);
    setSearchQuery('');
  }, [activeConversation, dispatch]);

  useEffect(() => {
    if (socket && activeConversation) {
      socket.emit('joinRoom', activeConversation);
      return () => {
        socket.emit('leaveRoom', activeConversation);
      };
    }
  }, [socket, activeConversation]);

  const rowVirtualizer = useVirtualizer({
    count: displayedMessages.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 100,
    overscan: 10,
  });

  useEffect(() => {
    if (rowVirtualizer.getTotalSize() > 0 && displayedMessages.length > 0 && !isSearchActive) {
      rowVirtualizer.scrollToIndex(displayedMessages.length - 1, { align: 'end' });
    }
  }, [displayedMessages.length, rowVirtualizer, isSearchActive]);

  useEffect(() => {
    if (!socket || !activeConversation || !currentMessages.length) return;
    currentMessages.forEach(msg => {
      if (msg.sender?._id !== user.id && msg.status !== 'read') {
        socket.emit('markAsRead', { conversationId: activeConversation, messageId: msg._id });
      }
    });
  }, [currentMessages, activeConversation, socket, user.id]);

  const handleSend = (payload) => {
    if (!socket || !activeConversation) return;

    const tempId = 'temp_' + Date.now();
    const optimisticMsg = {
      _id: tempId,
      conversation: activeConversation,
      content: payload.content,
      attachments: payload.attachments || [],
      messageType: payload.messageType || 'text',
      sender: user,
      createdAt: new Date().toISOString(),
      parentMessage: replyTo ? replyTo._id : null,
      status: 'sent'
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
    if (['delete_me', 'delete_everyone', 'forward'].includes(action)) {
      setSelectionMode(action);
      setSelectedMessages([message._id]);
    }
    if (action === 'pin') {
      try { await api.post(`/messages/conversation/${activeConversation}/messages/${message._id}/pin`); } catch (err) { console.error(err); }
    }
    if (action === 'bookmark') {
      try { await api.post(`/messages/${message._id}/bookmarks`); } catch (err) { console.error(err); }
    }
  };

  const handleToggleSelect = (msgId) => {
    setSelectedMessages(prev => 
      prev.includes(msgId) ? prev.filter(id => id !== msgId) : [...prev, msgId]
    );
  };

  const executeBulkAction = async () => {
    if (selectedMessages.length === 0) return;

    if (selectionMode === 'delete_me' || selectionMode === 'delete_everyone') {
      setShowDeleteModal(true);
    } else if (selectionMode === 'forward') {
      setShowForwardModal(true);
    }
  };

  const confirmDelete = async () => {
    try {
      const endpoint = selectionMode === 'delete_everyone' ? '/messages/bulk-delete-everyone' : '/messages/bulk-delete-me';
      await api.post(endpoint, { messageIds: selectedMessages });
      
      // Update local state optimism
      dispatch(removeMessagesBulk({ conversationId: activeConversation, messageIds: selectedMessages }));
      
      setSelectionMode(null);
      setSelectedMessages([]);
      setShowDeleteModal(false);
    } catch (err) {
      console.error(err);
    }
  };

  const confirmForward = async (targetConversations) => {
    try {
      await api.post('/messages/bulk-forward', { messageIds: selectedMessages, targetConversationIds: targetConversations });
      setSelectionMode(null);
      setSelectedMessages([]);
      setShowForwardModal(false);
    } catch (err) {
      console.error(err);
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
    <div className="flex h-full w-full bg-[#efeae2] dark:bg-[#0b141a] relative overflow-hidden" onClick={closeContextMenu}>
      <div className={`flex flex-col h-full transition-all duration-300 ${activeThread ? 'w-full sm:w-[calc(100%-24rem)]' : 'w-full'}`}>
        
        {/* Bulk Action Bar overlay */}
        {selectionMode && (
          <div className="absolute top-0 left-0 w-full z-[60] bg-background border-b shadow-sm p-3 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button onClick={() => { setSelectionMode(null); setSelectedMessages([]); }} className="p-1 hover:bg-muted rounded-full">
                <X className="w-5 h-5 text-muted-foreground"/>
              </button>
              <span className="font-semibold">{selectedMessages.length} Selected</span>
            </div>
            <div>
              <button 
                onClick={executeBulkAction}
                disabled={selectedMessages.length === 0}
                className="flex items-center gap-2 px-4 py-1.5 bg-primary text-primary-foreground rounded-lg disabled:opacity-50 hover:bg-primary/90"
              >
                {selectionMode === 'forward' ? <ForwardIcon className="w-4 h-4"/> : <Trash2 className="w-4 h-4"/>}
                {selectionMode === 'forward' ? 'Forward' : 'Delete'}
              </button>
            </div>
          </div>
        )}

        {/* Search Bar overlay */}
        {isSearchActive && !selectionMode && (
          <div className="absolute top-0 left-0 w-full z-[60] bg-background border-b shadow-sm p-3 flex items-center gap-3">
            <Search className="w-5 h-5 text-muted-foreground ml-2" />
            <input 
              autoFocus
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search messages..." 
              className="flex-1 bg-transparent focus:outline-none"
            />
            <span className="text-sm text-muted-foreground mr-2">{displayedMessages.length} results</span>
            <button onClick={() => { setIsSearchActive(false); setSearchQuery(''); }} className="p-1 hover:bg-muted rounded-full">
              <X className="w-5 h-5 text-muted-foreground"/>
            </button>
          </div>
        )}

        <ChatHeader 
          conversation={conversation} 
          onToggleInfo={() => setShowInfo(true)} 
          onSearchClick={() => setIsSearchActive(true)}
          socket={socket} 
        />
        <PinnedMessagesPanel conversationId={activeConversation} />
        
        {/* WhatsApp Background Pattern */}
        <div className="absolute inset-0 z-0 opacity-[0.06] dark:opacity-[0.04] pointer-events-none" style={{ backgroundImage: 'url("https://web.whatsapp.com/img/bg-chat-tile-dark_a4be512e7195b6b733d9110b408f075d.png")', backgroundRepeat: 'repeat' }}></div>

        <div 
          ref={parentRef} 
          className="flex-1 overflow-y-auto p-4 md:px-8 custom-scrollbar overflow-x-hidden relative z-10"
        >
          <div
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
              width: '100%',
              position: 'relative',
            }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const msg = displayedMessages[virtualRow.index];
              const prevMsg = virtualRow.index > 0 ? displayedMessages[virtualRow.index - 1] : null;
              
              let showDayHeader = false;
              if (!prevMsg || isSearchActive) {
                showDayHeader = !isSearchActive; // Don't show day headers in search mode
              } else {
                const currentDate = new Date(msg.createdAt).toDateString();
                const prevDate = new Date(prevMsg.createdAt).toDateString();
                if (currentDate !== prevDate) showDayHeader = true;
              }

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
                  {showDayHeader && <DayHeader date={msg.createdAt} />}
                  {msg.messageType === 'system' ? (
                    <SystemMessage message={msg} />
                  ) : (
                    <MessageBubble 
                      message={msg} 
                      isOwn={msg.sender?._id === user.id}
                      onReply={(m) => setReplyTo(m)}
                      onForward={(m) => handleContextAction('forward', m)}
                      onDeleteForMe={(id) => handleContextAction('delete_me', msg)}
                      onDeleteForEveryone={(id) => handleContextAction('delete_everyone', msg)}
                      onPin={(m) => handleContextAction('pin', m)}
                      onStar={(m) => handleContextAction('bookmark', m)}
                      onReact={(id, emoji) => api.post(`/messages/${id}/reactions`, { emoji })}
                      isSelectingMode={!!selectionMode}
                      isSelected={selectedMessages.includes(msg._id)}
                      onToggleSelect={handleToggleSelect}
                      searchQuery={searchQuery}
                    />
                  )}
                </div>
              );
            })}
          </div>
          
          {isTyping && !isSearchActive && (
            <div className="flex items-center gap-2 p-3 w-fit mt-2 rounded-2xl bg-white dark:bg-[#202c33] text-muted-foreground animate-in slide-in-from-bottom-2 shadow-sm">
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

        {!selectionMode && (
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
        )}
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
        onSearchClick={() => { setShowInfo(false); setIsSearchActive(true); }}
      />

      <DeleteModal 
        isOpen={showDeleteModal} 
        onClose={() => setShowDeleteModal(false)}
        onConfirm={confirmDelete}
        mode={selectionMode}
        count={selectedMessages.length}
      />

      <ForwardModal 
        isOpen={showForwardModal}
        onClose={() => setShowForwardModal(false)}
        onForward={confirmForward}
        count={selectedMessages.length}
      />
    </div>
  );
}
