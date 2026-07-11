const Conversation = require('../models/Conversation');
const ConversationMember = require('../models/ConversationMember');
const Message = require('../models/Message');
const ReadReceipt = require('../models/ReadReceipt');
const User = require('../models/User');

class ChatService {
  async getMyConversations(userId) {
    const memberships = await ConversationMember.find({ user: userId })
      .populate({
        path: 'conversation',
        populate: {
          path: 'createdBy',
          select: 'firstName lastName avatar'
        }
      });
      
    // Populate direct message partner details manually for UI
    const convIds = memberships.map(m => m.conversation._id);
    const allMembers = await ConversationMember.find({ conversation: { $in: convIds } })
      .populate('user', 'firstName lastName avatar companyEmail role');

    const result = memberships.map(m => {
      const conv = m.conversation.toObject();
      if (conv.type === 'direct') {
        const otherMember = allMembers.find(
          am => am.conversation.toString() === conv._id.toString() && am.user._id.toString() !== userId.toString()
        );
        if (otherMember) {
          conv.name = `${otherMember.user.firstName} ${otherMember.user.lastName}`;
          conv.avatar = otherMember.user.avatar;
          conv.partnerId = otherMember.user._id;
        }
      }
      return conv;
    });

    return result;
  }

  async getMessages(conversationId, page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const messages = await Message.find({ conversation: conversationId, isDeleted: false })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('sender', 'firstName lastName avatar')
      .populate('attachments')
      .populate('parentMessage');
    
    return messages.reverse();
  }

  async createDirectConversation(userId, partnerId) {
    // Check if exists
    const user1Memberships = await ConversationMember.find({ user: userId }).select('conversation');
    const user2Memberships = await ConversationMember.find({ user: partnerId }).select('conversation');
    
    const user1ConvIds = user1Memberships.map(m => m.conversation.toString());
    const commonConv = user2Memberships.find(m => user1ConvIds.includes(m.conversation.toString()));
    
    if (commonConv) {
      const existingConv = await Conversation.findOne({ _id: commonConv.conversation, type: 'direct' });
      if (existingConv) return existingConv;
    }

    const conversation = await Conversation.create({ type: 'direct', createdBy: userId });
    await ConversationMember.create([
      { conversation: conversation._id, user: userId, role: 'admin' },
      { conversation: conversation._id, user: partnerId, role: 'member' }
    ]);
    
    await ReadReceipt.create([
      { conversation: conversation._id, user: userId },
      { conversation: conversation._id, user: partnerId }
    ]);

    return conversation;
  }

  async createChannel(userId, name, memberIds = []) {
    const conversation = await Conversation.create({ type: 'channel', name, createdBy: userId });
    
    const members = [{ conversation: conversation._id, user: userId, role: 'admin' }];
    memberIds.forEach(id => {
      if (id !== userId) {
        members.push({ conversation: conversation._id, user: id, role: 'member' });
      }
    });

    await ConversationMember.create(members);
    
    const receipts = members.map(m => ({ conversation: conversation._id, user: m.user }));
    await ReadReceipt.create(receipts);

    return conversation;
  }

  async saveMessage(data) {
    const message = await Message.create({
      conversation: data.conversationId,
      sender: data.senderId,
      content: data.content,
      messageType: data.messageType || 'text',
      attachments: data.attachments || [],
      parentMessage: data.parentMessage || null,
      status: 'sent'
    });

    const populated = await Message.findById(message._id)
      .populate('sender', 'firstName lastName avatar')
      .populate('attachments');
    
    return populated;
  }
}

module.exports = new ChatService();
