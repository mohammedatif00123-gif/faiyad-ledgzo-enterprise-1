import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

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
  pinnedConversations: JSON.parse(localStorage.getItem('pinned_conversations') || '[]'),
  bookmarks: [],
  loading: false,
};

export const updateGroupInfo = createAsyncThunk('chat/updateGroupInfo', async ({ conversationId, data }, { rejectWithValue }) => {
  try {
    const res = await api.put(`/chat/conversations/${conversationId}/info`, data);
    return res.data.data;
  } catch (error) {
    return rejectWithValue(error.response?.data?.message || 'Failed to update group info');
  }
});

export const addGroupMembers = createAsyncThunk('chat/addGroupMembers', async ({ conversationId, memberIds, encryptedKeys }, { rejectWithValue }) => {
  try {
    const res = await api.post(`/chat/conversations/${conversationId}/members`, { memberIds, encryptedKeys });
    return res.data.data;
  } catch (error) {
    return rejectWithValue(error.response?.data?.message || 'Failed to add members');
  }
});

export const removeGroupMember = createAsyncThunk('chat/removeGroupMember', async ({ conversationId, userId }, { rejectWithValue }) => {
  try {
    const res = await api.delete(`/chat/conversations/${conversationId}/members/${userId}`);
    return res.data.data;
  } catch (error) {
    return rejectWithValue(error.response?.data?.message || 'Failed to remove member');
  }
});

export const updateMemberRole = createAsyncThunk('chat/updateMemberRole', async ({ conversationId, userId, role }, { rejectWithValue }) => {
  try {
    const res = await api.put(`/chat/conversations/${conversationId}/members/${userId}/role`, { role });
    return res.data.data;
  } catch (error) {
    return rejectWithValue(error.response?.data?.message || 'Failed to update role');
  }
});

export const leaveGroup = createAsyncThunk('chat/leaveGroup', async (conversationId, { rejectWithValue }) => {
  try {
    await api.post(`/chat/conversations/${conversationId}/leave`);
    return conversationId;
  } catch (error) {
    return rejectWithValue(error.response?.data?.message || 'Failed to leave group');
  }
});

export const deleteGroup = createAsyncThunk('chat/deleteGroup', async (conversationId, { rejectWithValue }) => {
  try {
    await api.delete(`/chat/conversations/${conversationId}`);
    return conversationId;
  } catch (error) {
    return rejectWithValue(error.response?.data?.message || 'Failed to delete group');
  }
});

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    setConversations: (state, action) => { state.conversations = action.payload; },
    updateConversation: (state, action) => {
      const updatedConv = action.payload;
      state.conversations = state.conversations.map(c => c._id === updatedConv._id ? { ...c, ...updatedConv } : c);
    },
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
    markConversationAsReadState: (state, action) => {
      const { conversationId, readBy } = action.payload;
      if (state.messages[conversationId]) {
        state.messages[conversationId].forEach(msg => {
          if (msg.sender?._id !== readBy && msg.status !== 'read') {
            msg.status = 'read';
          }
        });
      }
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
    removeMessagesBulk: (state, action) => {
      const { conversationId, messageIds } = action.payload;
      if (state.messages[conversationId]) {
        state.messages[conversationId] = state.messages[conversationId].filter(m => !messageIds.includes(m._id));
      }
      // Also clean up threadMessages if any matches
      Object.keys(state.threadMessages).forEach(rootId => {
        state.threadMessages[rootId] = state.threadMessages[rootId].filter(m => !messageIds.includes(m._id));
      });
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
    setLoading: (state, action) => { state.loading = action.payload; },
    togglePinnedConversation: (state, action) => {
      const convId = action.payload;
      if (state.pinnedConversations.includes(convId)) {
        state.pinnedConversations = state.pinnedConversations.filter(id => id !== convId);
      } else {
        state.pinnedConversations.push(convId);
      }
      localStorage.setItem('pinned_conversations', JSON.stringify(state.pinnedConversations));
    }
  },
  extraReducers: (builder) => {
    builder.addCase(leaveGroup.fulfilled, (state, action) => {
      state.conversations = state.conversations.filter(c => c._id !== action.payload);
      if (state.activeConversation === action.payload) {
        state.activeConversation = null;
      }
      delete state.messages[action.payload];
      delete state.readReceipts[action.payload];
    });
    builder.addCase(deleteGroup.fulfilled, (state, action) => {
      state.conversations = state.conversations.filter(c => c._id !== action.payload);
      if (state.activeConversation === action.payload) {
        state.activeConversation = null;
      }
      delete state.messages[action.payload];
      delete state.readReceipts[action.payload];
    });
  }
});

export const { 
  setConversations, updateConversation, removeConversation, setActiveConversation, setActiveThread, 
  setMessages, addMessage, updateMessage, removeMessage, removeMessagesBulk, setThreadMessages,
  setTyping, 
  setPinnedMessages, addPinnedMessage, removePinnedMessage,
  setBookmarks, addBookmark, removeBookmark,
  saveDraft, removeDraft,
  setLoading, togglePinnedConversation 
} = chatSlice.actions;
export default chatSlice.reducer;
