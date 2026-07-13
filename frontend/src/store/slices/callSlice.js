import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  activeCall: null, // { callId, conversationId, status, callType, participants, duration }
  incomingCall: null, // { callId, conversationId, from, callType, callerDetails }
  isCallModalOpen: false,
  networkQuality: 'Good', // 'Poor', 'Good', 'Excellent'
  devices: {
    audioInput: 'default',
    audioOutput: 'default',
    noiseSuppression: true,
    echoCancellation: true
  },
  callHistory: [],
  participantStates: {} // { userId: { muted: false, speaking: false, connectionState: 'connected', videoEnabled: false, screenSharing: false, handRaised: false } }
};

const callSlice = createSlice({
  name: 'call',
  initialState,
  reducers: {
    setIncomingCall: (state, action) => {
      state.incomingCall = action.payload;
      state.isCallModalOpen = true;
    },
    setActiveCall: (state, action) => {
      state.activeCall = { ...state.activeCall, ...action.payload };
      state.incomingCall = null;
    },
    addParticipant: (state, action) => {
      if (state.activeCall && !state.activeCall.participants.includes(action.payload)) {
        state.activeCall.participants.push(action.payload);
      }
    },
    updateCallStatus: (state, action) => {
      if (state.activeCall) {
        // action.payload can be a string (status) or an object { status, callId }
        const status = typeof action.payload === 'string' ? action.payload : action.payload.status;
        const callId = typeof action.payload === 'string' ? null : action.payload.callId;
        
        if (callId && state.activeCall.callId !== callId) return;
        state.activeCall.status = status;
      }
    },
    endCall: (state, action) => {
      const targetCallId = action.payload;
      if (targetCallId && state.activeCall && state.activeCall.callId !== targetCallId) {
        console.log('Skipping endCall because activeCall is different');
        return;
      }
      console.log('🔵 Resetting Redux call state');
      state.activeCall = null;
      state.incomingCall = null;
      state.participantStates = {};
      state.isCallModalOpen = false;
    },
    clearIncomingCall: (state) => {
      state.incomingCall = null;
      state.isCallModalOpen = false;
    },
    setNetworkQuality: (state, action) => {
      state.networkQuality = action.payload;
    },
    setDevicePreferences: (state, action) => {
      state.devices = { ...state.devices, ...action.payload };
    },
    updateParticipantState: (state, action) => {
      const { userId, ...updates } = action.payload;
      if (!state.participantStates[userId]) {
        state.participantStates[userId] = { 
          muted: false, speaking: false, connectionState: 'new', 
          videoEnabled: false, screenSharing: false, handRaised: false 
        };
      }
      state.participantStates[userId] = { ...state.participantStates[userId], ...updates };
    },
    setCallHistory: (state, action) => {
      state.callHistory = action.payload;
    }
  }
});

export const {
  setIncomingCall,
  setActiveCall,
  updateCallStatus,
  endCall,
  clearIncomingCall,
  setNetworkQuality,
  setDevicePreferences,
  updateParticipantState,
  setCallHistory,
  addParticipant
} = callSlice.actions;

export default callSlice.reducer;
