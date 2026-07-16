const BaseRepository = require('./BaseRepository');
const Message = require('../models/Message');

class MessageRepository extends BaseRepository {
  constructor() {
    super(Message);
  }

  async getMessagesByConversation(conversationId, skip, limit) {
    const messages = await this.model.find({ conversation: conversationId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('sender', 'firstName lastName avatar')
      .populate('attachments')
      .populate({
        path: 'parentMessage',
        populate: { path: 'sender', select: 'firstName lastName' }
      })
      .populate({
        path: 'forwardSource',
        populate: { path: 'sender', select: 'firstName lastName' }
      });
    return messages.reverse();
  }

  async getRepliesByThread(threadRootId, skip, limit) {
    return await this.model.find({ threadRoot: threadRootId })
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(limit)
      .populate('sender', 'firstName lastName avatar')
      .populate('attachments');
  }

  async markDeletedForEveryone(messageId) {
    return await this.updateById(messageId, { isDeleted: true });
  }

  async markDeletedForUser(messageId, userId) {
    return await this.model.findByIdAndUpdate(
      messageId,
      { $addToSet: { deletedForMe: userId } },
      { returnDocument: 'after' }
    );
  }

  async addReaction(messageId, emoji, userId) {
    // First, remove user's existing reaction with this emoji if it exists
    await this.model.updateOne(
      { _id: messageId, 'reactions.emoji': emoji },
      { $pull: { 'reactions.$.users': userId } }
    );
    // Then add it (if emoji array exists)
    const updated = await this.model.findOneAndUpdate(
      { _id: messageId, 'reactions.emoji': emoji },
      { $addToSet: { 'reactions.$.users': userId } },
      { returnDocument: 'after' }
    );
    if (!updated) {
      // If emoji array didn't exist
      return await this.model.findByIdAndUpdate(
        messageId,
        { $push: { reactions: { emoji, users: [userId] } } },
        { returnDocument: 'after' }
      );
    }
    return updated;
  }

  async removeReaction(messageId, emoji, userId) {
    return await this.model.findOneAndUpdate(
      { _id: messageId, 'reactions.emoji': emoji },
      { $pull: { 'reactions.$.users': userId } },
      { returnDocument: 'after' }
    );
  }
}

module.exports = new MessageRepository();
