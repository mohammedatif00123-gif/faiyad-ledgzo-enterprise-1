const DraftRepository = require('../repositories/DraftRepository');

class DraftService {
  async saveDraft(userId, conversationId, content, parentMessage = null) {
    return await DraftRepository.saveDraft(userId, conversationId, content, parentMessage);
  }

  async getDrafts(userId) {
    return await DraftRepository.getDraftsByUser(userId);
  }

  async deleteDraft(userId, conversationId, parentMessage = null) {
    return await DraftRepository.deleteDraft(userId, conversationId, parentMessage);
  }
}

module.exports = new DraftService();
