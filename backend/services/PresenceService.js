const PresenceRepository = require('../repositories/PresenceRepository');

class PresenceService {
  async getMyPresence(userId) {
    return await PresenceRepository.getPresence(userId);
  }

  async setStatus(userId, status, io = null) {
    const validStatuses = ['Online', 'Working', 'On Break', 'In Meeting', 'In Call', 'In Video Call', 'Screen Sharing', 'Away', 'Offline'];
    if (!validStatuses.includes(status)) {
      throw new Error(`Invalid status: ${status}`);
    }

    const additionalData = {};
    if (['Working', 'On Break', 'In Meeting', 'In Call', 'In Video Call', 'Screen Sharing'].includes(status)) {
      // Start of a session
      // If they are already in this state, we don't need to overwrite currentSessionStart, but for simplicity:
      const current = await PresenceRepository.getPresence(userId);
      if (current.status !== status) {
        additionalData.currentSessionStart = new Date();
      }
    } else {
      additionalData.currentSessionStart = null;
    }

    const updated = await PresenceRepository.updatePresence(userId, status, additionalData);

    // Socket.io integration (architecture prepared)
    if (io) {
      io.emit('presence_updated', updated);
    }

    return updated;
  }

  async getWorkforcePresence() {
    return await PresenceRepository.getAllPresence();
  }

  async getDashboardMetrics() {
    return await PresenceRepository.getCounts();
  }
}

module.exports = new PresenceService();
