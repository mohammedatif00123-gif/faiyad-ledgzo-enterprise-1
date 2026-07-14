const BaseRepository = require('./BaseRepository');
const DraftMessage = require('../models/DraftMessage');

class DraftRepository extends BaseRepository {
  constructor() {
    super(DraftMessage);
  }

  async saveDraft(userId, conversationId, content, parentMessage = null) {
    return await this.model.findOneAndUpdate(
      { user: userId, conversation: conversationId, parentMessage: parentMessage || null },
      { content },
      { returnDocument: 'after', upsert: true }
    );
  }

  async getDraftsByUser(userId) {
    return await this.find({ user: userId });
  }

  async deleteDraft(userId, conversationId, parentMessage = null) {
    return await this.model.findOneAndDelete({
      user: userId,
      conversation: conversationId,
      parentMessage: parentMessage || null
    });
  }
}

module.exports = new DraftRepository();
