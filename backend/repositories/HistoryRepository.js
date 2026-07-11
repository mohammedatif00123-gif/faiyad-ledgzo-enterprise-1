const BaseRepository = require('./BaseRepository');
const MessageHistory = require('../models/MessageHistory');

class HistoryRepository extends BaseRepository {
  constructor() {
    super(MessageHistory);
  }

  async saveHistory(messageId, previousContent, userId, reason) {
    return await this.create({
      message: messageId,
      previousContent,
      editedBy: userId,
      reason
    });
  }

  async getHistoryByMessage(messageId) {
    return await this.model.find({ message: messageId })
      .sort({ editedAt: -1 })
      .populate('editedBy', 'firstName lastName');
  }
}

module.exports = new HistoryRepository();
