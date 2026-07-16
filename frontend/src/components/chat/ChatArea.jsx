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
import { MessageInfoModal } from './MessageInfoModal';
import { groupMessagesByDay } from '../../utils/messageUtils';
import api from '../../services/api';
import { setMessages, prependMessages, setActiveThread, addMessage, removeMessagesBulk, markMessagesDeleted, updateMessage } from '../../store/slices/chatSlice';
import { exportAESKey, encryptText } from '../../utils/cryptoService';
import { X, Search, Trash2, Forward as ForwardIcon, Pin } from 'lucide-react';
import { useE2EE } from '../../context/E2EEContext';
import { toast } from 'sonner';

const getMemberId = (member) => {
  if (!member) return null;
  if (typeof member.user === 'object') {
    return member.user?._id || member.user?.id;
  }
  return member.user || null;
};

export function ChatArea({ socket }) {
  const dispatch = useDispatch();
  const { user } = useSelector(state => state.auth);
  const { conversations, activeConversation, messages, historyFetched = {}, activeThread, typing: stateTyping = {}, hasMoreHistory = {}, page = {}, pinnedMessages = {}, bookmarks = [] } = useSelector(state => state.chat);
  const { encryptDirectMessage, encryptGroupMessage, decryptDirectMessage, decryptGroupMessage, isReady: isE2EEReady } = useE2EE();
  
  const parentRef = useRef(null);
  const messagesEndRef = useRef(null);

  const [contextMenu, setContextMenu] = useState(null);
  const [replyTo, setReplyTo] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [showInfo, setShowInfo] = useState(false);

  // Selection & Search State
  const [selectionMode, setSelectionMode] = useState(null); // 'delete_me', 'delete_everyone', 'forward', 'pin'
  const [selectedMessages, setSelectedMessages] = useState([]);
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isFetchingMore, setIsFetchingMore] = useState(false);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showForwardModal, setShowForwardModal] = useState(false);
  
  const [selectedInfoMessage, setSelectedInfoMessage] = useState(null);
  const [showInfoModal, setShowInfoModal] = useState(false);

  const conversation = conversations.find(c => c._id === activeConversation);
  const currentMessages = messages[activeConversation] || [];

  // Filter messages if search is active
  const displayedMessages = isSearchActive && searchQuery
    ? currentMessages.filter(m => m.content?.toLowerCase().includes(searchQuery.toLowerCase()))
    : currentMessages;

  const convTyping = stateTyping[activeConversation] || {};
  const typingUsers = Object.keys(convTyping).filter(uid => convTyping[uid] && uid !== user.id);
  const isTyping = typingUsers.length > 0;

  const partnerIdForDirect = (conv, currentUserId) => {
    if (!conv) return null;
    if (conv.partnerId) return conv.partnerId;
    if (!conv.participants) return null;
    const p = conv.participants.find(pt => {
      const pId = typeof pt === 'object' ? (pt._id || pt.id) : pt;
      return pId !== currentUserId;
    });
    return p ? (typeof p === 'object' ? (p._id || p.id) : p) : null;
  };

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
    if (activeConversation && !historyFetched[activeConversation]) {
      api.get(`/messages/conversation/${activeConversation}`)
        .then(async (res) => {
          let fetchedMessages = res.data.data || [];

          if (isE2EEReady && fetchedMessages.length > 0) {
            const currentUserId = user?._id || user?.id;
            fetchedMessages = await Promise.all(fetchedMessages.map(async (msg) => {
              if (msg.isEncrypted && msg.iv) {
                try {
                  const senderId = typeof msg.sender === 'object' ? (msg.sender._id || msg.sender.id) : msg.sender;
                  // Decrypt everything for now. Optimistic UI is only for new messages.
                  if (conversation?.type === 'direct') {
                    msg.content = await decryptDirectMessage(msg.content, msg.iv, senderId === currentUserId ? partnerIdForDirect(conversation, currentUserId) : senderId);
                    if (msg.parentMessage && msg.parentMessage.isEncrypted && msg.parentMessage.iv && msg.parentMessage.content) {
                        try {
                           const parentSenderId = typeof msg.parentMessage.sender === 'object' ? (msg.parentMessage.sender._id || msg.parentMessage.sender.id) : msg.parentMessage.sender;
                           msg.parentMessage.content = await decryptDirectMessage(msg.parentMessage.content, msg.parentMessage.iv, parentSenderId === currentUserId ? partnerIdForDirect(conversation, currentUserId) : parentSenderId);
                        } catch(err) {
                           console.error('[E2EE] Initial Fetch Parent Decryption error:', err);
                           msg.parentMessage.content = `🔒 Unable to decrypt parent message`;
                        }
                    }
                  } else if (conversation?.type === 'channel' || conversation?.type === 'group') {
                    msg.content = await decryptGroupMessage(msg.content, msg.iv, activeConversation, msg.keyVersion);
                    if (msg.parentMessage && msg.parentMessage.isEncrypted && msg.parentMessage.iv && msg.parentMessage.content) {
                        try {
                           msg.parentMessage.content = await decryptGroupMessage(msg.parentMessage.content, msg.parentMessage.iv, activeConversation, msg.parentMessage.keyVersion);
                        } catch(err) {
                           console.error('[E2EE] Initial Fetch Parent Decryption error:', err);
                           msg.parentMessage.content = `🔒 Unable to decrypt parent message`;
                        }
                    }
                  }
                } catch (err) {
                  console.error('[E2EE] Initial Fetch Decryption error:', err);
                  msg.content = `🔒 Unable to decrypt message`;
                }
              }
              return msg;
            }));
          }

          dispatch(setMessages({ conversationId: activeConversation, messages: fetchedMessages }));
        })
        .catch(console.error);
    }
    // Reset selection & search when changing chats
    setSelectionMode(null);
    setSelectedMessages([]);
    setIsSearchActive(false);
    setSearchQuery('');
  }, [activeConversation, dispatch, isE2EEReady]);

  const handleScroll = async () => {
    if (!parentRef.current || isFetchingMore || isSearchActive) return;
    if (parentRef.current.scrollTop < 100) {
      if (hasMoreHistory[activeConversation]) {
        fetchMoreHistory();
      }
    }
  };

  const fetchMoreHistory = async () => {
    if (!activeConversation || isFetchingMore) return;
    setIsFetchingMore(true);
    
    // Remember scroll position from bottom
    const scrollHeightBefore = parentRef.current.scrollHeight;
    const scrollTopBefore = parentRef.current.scrollTop;

    try {
      const currentPage = page[activeConversation] || 1;
      const res = await api.get(`/messages/conversation/${activeConversation}?page=${currentPage + 1}&limit=50`);
      let fetchedMessages = res.data.data || [];
      
      if (isE2EEReady && fetchedMessages.length > 0) {
        const currentUserId = user?._id || user?.id;
        fetchedMessages = await Promise.all(fetchedMessages.map(async (msg) => {
          if (msg.isEncrypted && msg.iv) {
            try {
              const senderId = typeof msg.sender === 'object' ? (msg.sender._id || msg.sender.id) : msg.sender;
              if (conversation?.type === 'direct') {
                msg.content = await decryptDirectMessage(msg.content, msg.iv, senderId === currentUserId ? partnerIdForDirect(conversation, currentUserId) : senderId);
              } else if (conversation?.type === 'channel' || conversation?.type === 'group') {
                msg.content = await decryptGroupMessage(msg.content, msg.iv, activeConversation, msg.keyVersion);
              }
            } catch (err) {
              console.error('[E2EE] Pagination Fetch Decryption error:', err);
              msg.content = `🔒 Unable to decrypt message`;
            }
          }
          return msg;
        }));
      }

      dispatch(prependMessages({ conversationId: activeConversation, messages: fetchedMessages }));
      
      // Restore scroll position
      setTimeout(() => {
        if (parentRef.current) {
          const scrollHeightAfter = parentRef.current.scrollHeight;
          parentRef.current.scrollTop = scrollTopBefore + (scrollHeightAfter - scrollHeightBefore);
        }
      }, 0);

    } catch (err) {
      console.error('Failed to fetch more history:', err);
    } finally {
      setIsFetchingMore(false);
    }
  };

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

  const lastMessageId = displayedMessages.length > 0 ? displayedMessages[displayedMessages.length - 1]._id : null;

  useEffect(() => {
    if (rowVirtualizer.getTotalSize() > 0 && displayedMessages.length > 0 && !isSearchActive && !isFetchingMore) {
      rowVirtualizer.scrollToIndex(displayedMessages.length - 1, { align: 'end' });
    }
  }, [lastMessageId, rowVirtualizer, isSearchActive]);

  useEffect(() => {
    if (!socket || !activeConversation || !currentMessages.length) return;
    currentMessages.forEach(msg => {
      if (msg.sender?._id !== user.id && msg.status !== 'read') {
        socket.emit('markAsRead', { conversationId: activeConversation, messageId: msg._id });
      }
    });
  }, [currentMessages, activeConversation, socket, user.id]);

  const handleSend = async (payload) => {
    if (!socket || !activeConversation) return;
    
    const isEncryptedConversation = conversation?.type === 'direct' || conversation?.type === 'channel' || conversation?.type === 'group';

    if (isEncryptedConversation && !isE2EEReady) {
      console.log('[E2EE] Cannot send message: E2EE is not ready');
      return;
    }

    let contentToEmit = payload.content || "";
    let isEncrypted = false;
    let ivToEmit = null;
    let keyVersionToEmit = undefined;

    if (isE2EEReady) {
      if (conversation?.type === 'direct') {
        const partnerId = partnerIdForDirect(conversation, user._id || user.id);

        if (partnerId) {
          try {
            const encRes = await encryptDirectMessage(contentToEmit, partnerId);
            contentToEmit = encRes.ciphertext;
            ivToEmit = encRes.iv;
            isEncrypted = true;
          } catch (err) {
            console.error('[E2EE] Encryption failed', err);
            toast.error("Encryption failed: You don't have the active group key. If it is permanently lost, an admin must regenerate it.");
            return;
          }
        }
      } else if (conversation?.type === 'channel' || conversation?.type === 'group') {
        try {
          const encRes = await encryptGroupMessage(contentToEmit, activeConversation);
          contentToEmit = encRes.ciphertext;
          ivToEmit = encRes.iv;
          keyVersionToEmit = encRes.keyVersion;
          isEncrypted = true;
        } catch (err) {
          console.error('[E2EE] Encryption failed', err);
          toast.error("Encryption failed: You don't have the active group key. If it is permanently lost, an admin must regenerate it.");
          return;
        }
      }
    }

    const tempId = 'temp_' + Date.now();
    const optimisticMsg = {
      _id: tempId,
      conversation: activeConversation,
      content: payload.content, // keep plaintext in optimistic UI
      attachments: payload.attachments || [],
      messageType: payload.messageType || 'text',
      sender: user,
      createdAt: new Date().toISOString(),
      parentMessage: replyTo ? replyTo._id : null,
      status: 'sent',
      isEncrypted,
      keyVersion: keyVersionToEmit
    };

    dispatch(addMessage({ conversationId: activeConversation, message: optimisticMsg }));

    socket.emit('sendMessage', {
      conversationId: activeConversation,
      content: contentToEmit,
      attachments: payload.attachments || [],
      messageType: payload.messageType || 'text',
      parentMessage: replyTo ? replyTo._id : null,
      isEncrypted,
      iv: ivToEmit,
      keyVersion: keyVersionToEmit
    });
    setReplyTo(null);
  };

  const handleEdit = async (messageId, newContent) => {
    if (!activeConversation) return;

    let contentToEmit = newContent;
    let isEncrypted = false;
    let ivToEmit = null;
    let keyVersionToEmit = undefined;

    if (isE2EEReady) {
      if (conversation?.type === 'direct') {
        const partnerId = partnerIdForDirect(conversation, user._id || user.id);
        if (partnerId) {
          try {
            const encRes = await encryptDirectMessage(contentToEmit, partnerId);
            contentToEmit = encRes.ciphertext;
            ivToEmit = encRes.iv;
            isEncrypted = true; 
          } catch (err) {
            console.error('[E2EE] Edit encryption failed', err);
            return;
          }
        }
      } else if (conversation?.type === 'channel' || conversation?.type === 'group') {
        try {
          const encRes = await encryptGroupMessage(contentToEmit, activeConversation);
          contentToEmit = encRes.ciphertext;
          ivToEmit = encRes.iv;
          keyVersionToEmit = encRes.keyVersion;
          isEncrypted = true;
        } catch (err) {
          console.error('[E2EE] Edit encryption failed', err);
          return;
        }
      }
    }

    try {
      await api.put(`/messages/${messageId}`, { 
        content: contentToEmit,
        iv: ivToEmit,
        keyVersion: keyVersionToEmit
      });
      setEditingMessage(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleContextMenu = (x, y, message) => {
    setContextMenu({ x, y, message });
  };

  const closeContextMenu = () => {
    setContextMenu(null);
  };

  const handleContextAction = async (action, message) => {
    if (action === 'reply') setReplyTo(message);
    if (action === 'edit') setEditingMessage(message);
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
    if (action === 'info') {
      setSelectedInfoMessage(message);
      setShowInfoModal(true);
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
      if (selectionMode === 'delete_everyone') {
        dispatch(markMessagesDeleted({ conversationId: activeConversation, messageIds: selectedMessages }));
      } else {
        dispatch(removeMessagesBulk({ conversationId: activeConversation, messageIds: selectedMessages }));
      }

      setSelectionMode(null);
      setSelectedMessages([]);
      setShowDeleteModal(false);
    } catch (err) {
      console.error(err);
    }
  };

  const confirmForward = async (targetConversations) => {
    try {
      if (!socket) return;
      
      const msgsToForward = currentMessages.filter(m => selectedMessages.includes(m._id));
      
      for (const targetConvId of targetConversations) {
        const targetConv = conversations.find(c => c._id === targetConvId);
        if (!targetConv) continue;
        
        const isEncryptedConv = targetConv.type === 'direct' || targetConv.type === 'channel' || targetConv.type === 'group';
        
        for (const msg of msgsToForward) {
          let contentToEmit = msg.content || "";
          let isEncrypted = false;
          let ivToEmit = null;
          let keyVersionToEmit = undefined;
          
          if (isEncryptedConv && isE2EEReady) {
            if (targetConv.type === 'direct') {
              const partnerId = partnerIdForDirect(targetConv, user._id || user.id);
              if (partnerId) {
                try {
                  const encRes = await encryptDirectMessage(contentToEmit, partnerId);
                  contentToEmit = encRes.ciphertext;
                  ivToEmit = encRes.iv;
                  isEncrypted = true;
                } catch (err) {
                  console.error('[E2EE] Forward encryption failed', err);
                  continue; // skip this message for this target
                }
              }
            } else {
              try {
                const encRes = await encryptGroupMessage(contentToEmit, targetConv._id);
                contentToEmit = encRes.ciphertext;
                ivToEmit = encRes.iv;
                keyVersionToEmit = encRes.keyVersion;
                isEncrypted = true;
              } catch (err) {
                console.error('[E2EE] Forward encryption failed', err);
                continue; // skip this message for this target
              }
            }
          }
          
          socket.emit('sendMessage', {
            conversationId: targetConvId,
            content: contentToEmit,
            attachments: msg.attachments || [],
            messageType: msg.messageType || 'text',
            parentMessage: null, // do not forward replies as replies in the new chat
            isEncrypted,
            iv: ivToEmit,
            keyVersion: keyVersionToEmit,
            isForwarded: true,
            forwardSource: msg._id
          });
        }
      }
      
      toast.success('Messages forwarded successfully');
      setSelectionMode(null);
      setSelectedMessages([]);
      setShowForwardModal(false);
    } catch (err) {
      console.error('Forward failed', err);
      toast.error('Failed to forward messages');
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
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
              <span className="font-semibold">{selectedMessages.length} Selected</span>
            </div>
            <div>
              <button
                onClick={executeBulkAction}
                disabled={selectedMessages.length === 0}
                className="flex items-center gap-2 px-4 py-1.5 bg-primary text-primary-foreground rounded-lg disabled:opacity-50 hover:bg-primary/90"
              >
                {selectionMode === 'forward' ? <ForwardIcon className="w-4 h-4" /> : <Trash2 className="w-4 h-4" />}
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
              <X className="w-5 h-5 text-muted-foreground" />
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
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto p-4 md:px-8 custom-scrollbar overflow-x-hidden relative z-10"
        >
          {isFetchingMore && (
            <div className="flex justify-center py-2">
              <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}
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
                      isPinned={pinnedMessages[activeConversation]?.some(p => p.message?._id === msg._id)}
                      isStarred={bookmarks?.some(b => b.message?._id === msg._id)}
                      onAction={handleContextAction}
                      onReact={(id, emoji) => {
                        // Optimistic update
                        const msg = currentMessages.find(m => m._id === id);
                        if (msg) {
                          const currentUserId = user?._id || user?.id;
                          let newReactions = [...(msg.reactions || [])];
                          let existingReactionIndex = newReactions.findIndex(r => r.emoji === emoji);
                          
                          if (existingReactionIndex !== -1) {
                            const reaction = { ...newReactions[existingReactionIndex] };
                            const hasReacted = reaction.users.some(u => u === currentUserId || u._id === currentUserId);
                            
                            if (hasReacted) {
                              reaction.users = reaction.users.filter(u => u !== currentUserId && u._id !== currentUserId);
                              if (reaction.users.length === 0) {
                                newReactions.splice(existingReactionIndex, 1);
                              } else {
                                newReactions[existingReactionIndex] = reaction;
                              }
                            } else {
                              reaction.users = [...reaction.users, currentUserId];
                              newReactions[existingReactionIndex] = reaction;
                            }
                          } else {
                            newReactions.push({ emoji, users: [currentUserId] });
                          }
                          
                          dispatch(updateMessage({
                            conversationId: activeConversation,
                            messageId: id,
                            updates: { reactions: newReactions }
                          }));
                        }
                        
                        api.post(`/messages/${id}/reactions`, { emoji });
                      }}
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
            onEdit={handleEdit}
            onTyping={(isTyping) => {
              if (socket && activeConversation) {
                socket.emit('typing', { conversationId: activeConversation, isTyping });
              }
            }}
            replyTo={replyTo}
            onCancelReply={() => setReplyTo(null)}
            editingMessage={editingMessage}
            onCancelEdit={() => setEditingMessage(null)}
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

      <MessageInfoModal
        isOpen={showInfoModal}
        onClose={() => {
          setShowInfoModal(false);
          setSelectedInfoMessage(null);
        }}
        message={selectedInfoMessage}
        isGroup={conversation?.type === 'group' || conversation?.type === 'channel'}
      />
    </div>
  );
}

