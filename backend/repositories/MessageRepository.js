const BaseRepository = require('./BaseRepository');
const Message = require('../models/Message');

class MessageRepository extends BaseRepository {
  constructor() {
    super(Message);
  }

  async getMessagesByConversation(conversationId, skip, limit) {
    const messages = await this.model.find({ conversation: conversationId, isDeleted: false })
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
    return await this.model.find({ threadRoot: threadRootId, isDeleted: false })
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(limit)
      .populate('sender', 'firstName lastName avatar')
      .populate('attachments');
  }

  async markDeletedForEveryone(messageId) {
    return await this.update(messageId, { isDeleted: true });
  }

  async markDeletedForUser(messageId, userId) {
    return await this.model.findByIdAndUpdate(
      messageId,
      { $addToSet: { deletedForMe: userId } },
      { new: true }
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
      { new: true }
    );
    if (!updated) {
      // If emoji array didn't exist
      return await this.model.findByIdAndUpdate(
        messageId,
        { $push: { reactions: { emoji, users: [userId] } } },
        { new: true }
      );
    }
    return updated;
  }

  async removeReaction(messageId, emoji, userId) {
    return await this.model.findOneAndUpdate(
      { _id: messageId, 'reactions.emoji': emoji },
      { $pull: { 'reactions.$.users': userId } },
      { new: true }
    );
  }
}

module.exports = new MessageRepository();
