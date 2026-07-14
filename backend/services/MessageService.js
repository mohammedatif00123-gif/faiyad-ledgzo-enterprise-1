const MessageRepository = require('../repositories/MessageRepository');
const HistoryRepository = require('../repositories/HistoryRepository');

class MessageService {
  async getMessages(conversationId, page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    return await MessageRepository.getMessagesByConversation(conversationId, skip, limit);
  }

  async getReplies(threadRootId, page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    return await MessageRepository.getRepliesByThread(threadRootId, skip, limit);
  }

  async saveMessage(data) {
    const message = await MessageRepository.create({
      conversation: data.conversationId,
      sender: data.senderId,
      content: data.content,
      messageType: data.messageType || 'text',
      attachments: data.attachments || [],
      parentMessage: data.parentMessage || null,
      threadRoot: data.threadRoot || null,
      isForwarded: data.isForwarded || false,
      forwardSource: data.forwardSource || null,
      isEncrypted: data.isEncrypted || false,
      iv: data.iv || null,
      status: 'sent',
      scheduledFor: data.scheduledFor || null,
      mentions: data.mentions || []
    });

    const populated = await MessageRepository.model.findById(message._id)
      .populate('sender', 'firstName lastName avatar')
      .populate('attachments')
      .populate({ path: 'parentMessage', populate: { path: 'sender', select: 'firstName lastName' } })
      .populate({ path: 'forwardSource', populate: { path: 'sender', select: 'firstName lastName' } });
    
    return populated;
  }

  async editMessage(messageId, userId, newContent, reason) {
    const message = await MessageRepository.findById(messageId);
    if (!message) throw new Error('Message not found');
    if (message.sender.toString() !== userId.toString()) throw new Error('Unauthorized');

    await HistoryRepository.saveHistory(messageId, message.content, userId, reason);

    const updated = await MessageRepository.update(messageId, {
      content: newContent,
      isEdited: true
    });

    return await MessageRepository.model.findById(updated._id)
      .populate('sender', 'firstName lastName avatar')
      .populate('attachments')
      .populate({ path: 'parentMessage', populate: { path: 'sender', select: 'firstName lastName' } });
  }

  async deleteForEveryone(messageId, userId, userRole) {
    const message = await MessageRepository.findById(messageId);
    if (!message) throw new Error('Message not found');
    if (message.sender.toString() !== userId.toString() && userRole !== 'Admin') {
      throw new Error('Unauthorized');
    }

    await MessageRepository.markDeletedForEveryone(messageId);
    return message;
  }

  async deleteForMe(messageId, userId) {
    await MessageRepository.markDeletedForUser(messageId, userId);
    return true;
  }

  async addReaction(messageId, emoji, userId) {
    return await MessageRepository.addReaction(messageId, emoji, userId);
  }

  async removeReaction(messageId, emoji, userId) {
    return await MessageRepository.removeReaction(messageId, emoji, userId);
  }

  async updateDeliveryStatus(messageId, status) {
    return await MessageRepository.updateById(messageId, { status });
  }
}

module.exports = new MessageService();
