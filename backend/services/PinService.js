const PinRepository = require('../repositories/PinRepository');

class PinService {
  async pinMessage(conversationId, messageId, userId) {
    return await PinRepository.pinMessage(conversationId, messageId, userId);
  }

  async unpinMessage(conversationId, messageId) {
    return await PinRepository.unpinMessage(conversationId, messageId);
  }

  async getPinnedMessages(conversationId) {
    return await PinRepository.getPinsByConversation(conversationId);
  }
}

module.exports = new PinService();
