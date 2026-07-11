import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  conversations: [],
  activeConversation: null,
  activeThread: null, // thread root message ID
  messages: {}, // { conversationId: [messages] }
  threadMessages: {}, // { threadRootId: [messages] }
  typing: {}, // { conversationId: { userId: boolean } }
  readReceipts: {}, // { conversationId: unreadCount }
  drafts: {}, // { conversationId_parentMessageId: draftContent }
  pinnedMessages: {}, // { conversationId: [pins] }
  bookmarks: [],
  loading: false,
};

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    setConversations: (state, action) => { state.conversations = action.payload; },
    removeConversation: (state, action) => {
      state.conversations = state.conversations.filter(c => c._id !== action.payload);
      if (state.activeConversation === action.payload) {
        state.activeConversation = null;
      }
      delete state.messages[action.payload];
      delete state.readReceipts[action.payload];
    },
    setActiveConversation: (state, action) => {
      state.activeConversation = action.payload;
      state.activeThread = null; // Close thread when switching channel
      if (action.payload && state.readReceipts[action.payload]) {
        state.readReceipts[action.payload] = 0;
      }
    },
    setActiveThread: (state, action) => { state.activeThread = action.payload; },
    setMessages: (state, action) => {
      const { conversationId, messages } = action.payload;
      state.messages[conversationId] = messages;
    },
    addMessage: (state, action) => {
      const { conversationId, message } = action.payload;
      
      // If it's a thread reply, add to threadMessages
      if (message.threadRoot) {
        if (!state.threadMessages[message.threadRoot]) state.threadMessages[message.threadRoot] = [];
        
        // Remove temp message if it exists
        if (!message._id.toString().startsWith('temp_')) {
          state.threadMessages[message.threadRoot] = state.threadMessages[message.threadRoot].filter(
            m => !(m._id.toString().startsWith('temp_') && m.content === message.content && m.sender?._id === message.sender?._id)
          );
        }

        const exists = state.threadMessages[message.threadRoot].find(m => m._id === message._id);
        if (!exists) state.threadMessages[message.threadRoot].push(message);
      }
      
      // Add to main channel
      if (!message.threadRoot) {
        if (!state.messages[conversationId]) state.messages[conversationId] = [];
        
        // Remove temp message if it exists
        if (!message._id.toString().startsWith('temp_')) {
          state.messages[conversationId] = state.messages[conversationId].filter(
            m => !(m._id.toString().startsWith('temp_') && m.content === message.content && m.sender?._id === message.sender?._id)
          );
        }

        const exists = state.messages[conversationId].find(m => m._id === message._id);
        if (!exists) {
          state.messages[conversationId].push(message);
          if (state.activeConversation !== conversationId) {
            state.readReceipts[conversationId] = (state.readReceipts[conversationId] || 0) + 1;
          }
        }
      }
    },
    updateMessage: (state, action) => {
      const { conversationId, messageId, updates, threadRootId } = action.payload;
      
      const updateInArray = (arr) => {
        if (!arr) return;
        const index = arr.findIndex(m => m._id === messageId);
        if (index !== -1) arr[index] = { ...arr[index], ...updates };
      };

      updateInArray(state.messages[conversationId]);
      if (threadRootId) updateInArray(state.threadMessages[threadRootId]);
    },
    removeMessage: (state, action) => {
      const { conversationId, messageId, threadRootId } = action.payload;
      if (state.messages[conversationId]) {
        state.messages[conversationId] = state.messages[conversationId].filter(m => m._id !== messageId);
      }
      if (threadRootId && state.threadMessages[threadRootId]) {
        state.threadMessages[threadRootId] = state.threadMessages[threadRootId].filter(m => m._id !== messageId);
      }
    },
    setThreadMessages: (state, action) => {
      const { threadRootId, messages } = action.payload;
      state.threadMessages[threadRootId] = messages;
    },
    setTyping: (state, action) => {
      const { conversationId, userId, isTyping } = action.payload;
      if (!state.typing[conversationId]) state.typing[conversationId] = {};
      state.typing[conversationId][userId] = isTyping;
    },
    setPinnedMessages: (state, action) => {
      const { conversationId, pins } = action.payload;
      state.pinnedMessages[conversationId] = pins;
    },
    addPinnedMessage: (state, action) => {
      const { conversationId, pin } = action.payload;
      if (!state.pinnedMessages[conversationId]) state.pinnedMessages[conversationId] = [];
      state.pinnedMessages[conversationId].push(pin);
    },
    removePinnedMessage: (state, action) => {
      const { conversationId, messageId } = action.payload;
      if (state.pinnedMessages[conversationId]) {
        state.pinnedMessages[conversationId] = state.pinnedMessages[conversationId].filter(p => p.message._id !== messageId);
      }
    },
    setBookmarks: (state, action) => { state.bookmarks = action.payload; },
    addBookmark: (state, action) => { state.bookmarks.push(action.payload); },
    removeBookmark: (state, action) => {
      state.bookmarks = state.bookmarks.filter(b => b.message._id !== action.payload.messageId);
    },
    saveDraft: (state, action) => {
      const { key, content } = action.payload;
      state.drafts[key] = content;
    },
    removeDraft: (state, action) => {
      delete state.drafts[action.payload];
    },
    setLoading: (state, action) => { state.loading = action.payload; }
  },
});

export const { 
  setConversations, removeConversation, setActiveConversation, setActiveThread, 
  setMessages, addMessage, updateMessage, removeMessage, setThreadMessages,
  setTyping, 
  setPinnedMessages, addPinnedMessage, removePinnedMessage,
  setBookmarks, addBookmark, removeBookmark,
  saveDraft, removeDraft,
  setLoading 
} = chatSlice.actions;
export default chatSlice.reducer;
