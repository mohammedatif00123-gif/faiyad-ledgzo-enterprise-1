const BaseRepository = require('./BaseRepository');
const PinnedMessage = require('../models/PinnedMessage');

class PinRepository extends BaseRepository {
  constructor() {
    super(PinnedMessage);
  }

  async pinMessage(conversationId, messageId, userId) {
    return await this.model.findOneAndUpdate(
      { conversation: conversationId, message: messageId },
      { pinnedBy: userId, pinnedAt: Date.now() },
      { new: true, upsert: true }
    ).populate('message');
  }

  async unpinMessage(conversationId, messageId) {
    return await this.model.findOneAndDelete({ conversation: conversationId, message: messageId });
  }

  async getPinsByConversation(conversationId) {
    return await this.model.find({ conversation: conversationId }).populate({
      path: 'message',
      populate: { path: 'sender', select: 'firstName lastName avatar' }
    });
  }
}

module.exports = new PinRepository();
