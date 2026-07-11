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
    updateCallStatus: (state, action) => {
      if (state.activeCall) {
        state.activeCall.status = action.payload;
      }
    },
    endCall: (state) => {
      state.activeCall = null;
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
  setCallHistory
} = callSlice.actions;

export default callSlice.reducer;
