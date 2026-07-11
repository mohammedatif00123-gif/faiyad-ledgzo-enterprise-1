import api from './api';

export const attendanceService = {
  startWork: async () => {
    const response = await api.post('/attendance/start');
    return response.data;
  },

  endWork: async () => {
    const response = await api.post('/attendance/end');
    return response.data;
  },

  breakStart: async () => {
    const response = await api.post('/attendance/break/start');
    return response.data;
  },

  breakEnd: async () => {
    const response = await api.post('/attendance/break/end');
    return response.data;
  },

  getMyToday: async () => {
    const response = await api.get('/attendance/me/today');
    return response.data;
  },

  getMyHistory: async (params) => {
    const response = await api.get('/attendance/me/history', { params });
    return response.data;
  },

  // Admin
  getAllAttendance: async (params) => {
    const response = await api.get('/attendance', { params });
    return response.data;
  }
};
