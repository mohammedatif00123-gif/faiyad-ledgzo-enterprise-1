import api from './api';

export const presenceService = {
  getMyPresence: async () => {
    const response = await api.get('/presence/me');
    return response.data;
  },

  // Admin
  getWorkforcePresence: async () => {
    const response = await api.get('/presence/workforce');
    return response.data;
  },

  getDashboardMetrics: async () => {
    const response = await api.get('/presence/metrics');
    return response.data;
  }
};
