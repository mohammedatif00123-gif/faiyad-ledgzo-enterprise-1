const HistoryRepository = require('../repositories/HistoryRepository');

class HistoryService {
  async getMessageHistory(messageId) {
    return await HistoryRepository.getHistoryByMessage(messageId);
  }
}

module.exports = new HistoryService();
