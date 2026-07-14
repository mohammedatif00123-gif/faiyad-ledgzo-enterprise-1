import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import chatReducer from './slices/chatSlice';
import notificationReducer from './slices/notificationSlice';
import callReducer from './slices/callSlice';
import attendanceReducer from './slices/attendanceSlice';
import leaveReducer from './slices/leaveSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    chat: chatReducer,
    notifications: notificationReducer,
    call: callReducer,
    attendance: attendanceReducer,
    leaves: leaveReducer,
  },
  devTools: import.meta.env.MODE !== 'production',
});
