const Conversation = require('../models/Conversation');
const ConversationMember = require('../models/ConversationMember');
const Message = require('../models/Message');
const ReadReceipt = require('../models/ReadReceipt');
const GroupKey = require('../models/GroupKey');
const User = require('../models/User');

class ChatService {
  async getMyConversations(userId) {
    const memberships = await ConversationMember.find({ 
      user: userId, 
      status: { $ne: 'rejected' } 
    })
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
      .populate('user', 'firstName lastName avatar companyEmail role presenceStatus awayReason');

    const result = memberships.map(m => {
      const conv = m.conversation.toObject();
      conv.isPinned = m.isPinned;
      conv.isMuted = m.isMuted;
      conv.notificationMuteUntil = m.notificationMuteUntil;
      
      if (conv.type === 'direct') {
        const otherMember = allMembers.find(
          am => am.conversation.toString() === conv._id.toString() && am.user && am.user._id.toString() !== userId.toString()
        );
        if (otherMember) {
          conv.name = `${otherMember.user.firstName} ${otherMember.user.lastName}`;
          conv.avatar = otherMember.user.avatar;
          conv.partnerId = otherMember.user._id;
          conv.partnerStatus = otherMember.user.presenceStatus;
          conv.partnerAwayReason = otherMember.user.awayReason;
        }
      }
      return conv;
    });

    // Deduplicate in case of historical duplicate data
    const uniqueResult = [];
    const seenDirects = new Set();
    
    for (const conv of result) {
      if (conv.type === 'direct' && conv.partnerId) {
        if (seenDirects.has(conv.partnerId.toString())) {
          continue; // Skip duplicate direct chat
        }
        seenDirects.add(conv.partnerId.toString());
      }
      uniqueResult.push(conv);
    }

    // Sort by latest activity
    uniqueResult.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

    return uniqueResult;
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
    const user1Memberships = await ConversationMember.find({ user: userId }).populate('conversation');
    const user1DirectConvs = user1Memberships
      .filter(m => m.conversation && m.conversation.type === 'direct')
      .map(m => m.conversation._id.toString());
      
    const existingMembership = await ConversationMember.findOne({
      user: partnerId,
      conversation: { $in: user1DirectConvs }
    });
    
    if (existingMembership) {
      const existingConv = await Conversation.findById(existingMembership.conversation);
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

  async createChannel(userId, name, memberIds = [], extraData = {}) {
    const { description = '', avatar = null, visibility = 'private', encryptedKeys = [] } = extraData;
    const conversation = await Conversation.create({ 
      type: 'channel', 
      name, 
      description,
      avatar,
      visibility,
      createdBy: userId,
      memberCount: memberIds.length + 1
    });
    
    const members = [{ conversation: conversation._id, user: userId, role: 'admin' }];
    memberIds.forEach(id => {
      if (id !== userId) {
        members.push({ conversation: conversation._id, user: id, role: 'member' });
      }
    });

    await ConversationMember.create(members);
    
    const receipts = members.map(m => ({ conversation: conversation._id, user: m.user }));
    await ReadReceipt.create(receipts);

    if (encryptedKeys && encryptedKeys.length > 0) {
      const keysToInsert = encryptedKeys.map(ek => ({
        conversation: conversation._id,
        user: ek.user,
        encryptedKey: ek.encryptedKey,
        encryptedBy: userId
      }));
      await GroupKey.create(keysToInsert);
    }

    await this._createSystemMessage(conversation._id, userId, 'GROUP_CREATED', 'Created this group');

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
  async _createSystemMessage(conversationId, initiatorId, action, content) {
    const { getIO } = require('../sockets');
    const message = await Message.create({
      conversation: conversationId,
      sender: initiatorId,
      content,
      messageType: 'system',
      systemAction: action,
      status: 'sent'
    });

    const populated = await Message.findById(message._id)
      .populate('sender', 'firstName lastName avatar');

    const io = getIO();
    if (io) {
      io.to(conversationId.toString()).emit('new_message', populated);
    }
    return populated;
  }

  async _checkAdmin(userId, conversationId) {
    const membership = await ConversationMember.findOne({ user: userId, conversation: conversationId });
    if (!membership) throw new Error('Not a member of this group');
    if (membership.role !== 'admin' && membership.role !== 'owner') {
      throw new Error('Requires admin privileges');
    }
    return membership;
  }

  async updateGroupInfo(userId, conversationId, updates) {
    await this._checkAdmin(userId, conversationId);
    const conversation = await Conversation.findByIdAndUpdate(conversationId, updates, { returnDocument: 'after' });
    await this._createSystemMessage(conversationId, userId, 'GROUP_RENAMED', `Group info was updated`);
    return conversation;
  }

  async addGroupMembers(userId, conversationId, memberIds, encryptedKeys = []) {
    await this._checkAdmin(userId, conversationId);
    
    // Filter out users already in group
    const existingMembers = await ConversationMember.find({ conversation: conversationId });
    const existingIds = existingMembers.map(m => m.user.toString());
    const newIds = memberIds.filter(id => !existingIds.includes(id));

    if (newIds.length > 0) {
      const membersToCreate = newIds.map(id => ({ conversation: conversationId, user: id, role: 'member' }));
      await ConversationMember.insertMany(membersToCreate);
      
      const receiptsToCreate = newIds.map(id => ({ conversation: conversationId, user: id }));
      await ReadReceipt.insertMany(receiptsToCreate);

      if (encryptedKeys && encryptedKeys.length > 0) {
        const keysToInsert = encryptedKeys.map(ek => ({
          conversation: conversationId,
          user: ek.user,
          encryptedKey: ek.encryptedKey,
          encryptedBy: userId
        }));
        await GroupKey.insertMany(keysToInsert);
      }

      await Conversation.findByIdAndUpdate(conversationId, { $inc: { memberCount: newIds.length } });
      
      await this._createSystemMessage(conversationId, userId, 'MEMBER_ADDED', `Added ${newIds.length} members`);
      
      const { getIO } = require('../sockets');
      const io = getIO();
      if (io) {
        newIds.forEach(id => {
          io.to(`user_${id}`).emit('group_added', { conversationId });
        });
      }
    }
    return await Conversation.findById(conversationId);
  }

  async removeGroupMember(userId, conversationId, targetUserId) {
    await this._checkAdmin(userId, conversationId);
    
    const membership = await ConversationMember.findOne({ user: targetUserId, conversation: conversationId });
    if (!membership) throw new Error('User not found in group');
    if (membership.role === 'owner') throw new Error('Cannot remove the group owner');

    await ConversationMember.deleteOne({ _id: membership._id });
    await Conversation.findByIdAndUpdate(conversationId, { $inc: { memberCount: -1 } });
    
    await this._createSystemMessage(conversationId, userId, 'MEMBER_REMOVED', `Removed a member`);
    
    const { getIO } = require('../sockets');
    const io = getIO();
    if (io) io.to(`user_${targetUserId}`).emit('group_removed', { conversationId });

    return await Conversation.findById(conversationId);
  }

  async updateMemberRole(userId, conversationId, targetUserId, role) {
    await this._checkAdmin(userId, conversationId);
    
    const membership = await ConversationMember.findOne({ user: targetUserId, conversation: conversationId });
    if (!membership) throw new Error('User not found in group');
    if (membership.role === 'owner') throw new Error('Cannot change owner role');

    membership.role = role;
    await membership.save();

    const action = role === 'admin' ? 'ADMIN_PROMOTED' : 'ADMIN_REMOVED';
    await this._createSystemMessage(conversationId, userId, action, `Member role updated to ${role}`);

    return await Conversation.findById(conversationId);
  }

  async resendGroupKey(userId, conversationId, targetUserId, encryptedKey) {
    await this._checkAdmin(userId, conversationId);
    
    const targetMember = await ConversationMember.findOne({ 
      user: targetUserId, 
      conversation: conversationId 
    });
    if (!targetMember) throw new Error('Target user is not a member of this group');

    await GroupKey.findOneAndUpdate(
      { conversation: conversationId, user: targetUserId },
      { 
        encryptedKey, 
        encryptedBy: userId 
      },
      { upsert: true }
    );
  }

  async reEncryptGroupKeys(userId, conversationId, keys) {
    await this._checkAdmin(userId, conversationId);

    await GroupKey.deleteMany({ conversation: conversationId });

    const keysToInsert = keys.map(k => ({
      conversation: conversationId,
      user: k.userId,
      encryptedKey: k.encryptedKey,
      encryptedBy: userId
    }));

    await GroupKey.insertMany(keysToInsert);

    const { getIO } = require('../sockets');
    const io = getIO();
    if (io) {
      io.to(conversationId.toString()).emit('group_keys_updated', { conversationId });
    }
    
    await this._createSystemMessage(conversationId, userId, 'KEYS_UPDATED', `Re-encrypted group keys for all members`);
  }

  async leaveGroup(userId, conversationId) {
    const membership = await ConversationMember.findOne({ user: userId, conversation: conversationId });
    if (!membership) throw new Error('Not a member');
    if (membership.role === 'owner') {
      throw new Error('Owner cannot leave group. Transfer ownership or delete group.');
    }

    await ConversationMember.deleteOne({ _id: membership._id });
    await Conversation.findByIdAndUpdate(conversationId, { $inc: { memberCount: -1 } });
    
    await this._createSystemMessage(conversationId, userId, 'MEMBER_LEFT', `Left the group`);
  }

  async deleteGroup(userId, conversationId) {
    await this._checkAdmin(userId, conversationId);
    
    await this._createSystemMessage(conversationId, userId, 'GROUP_DELETED', `Group was deleted`);
    
    // Soft delete or hard delete based on requirements
    await Conversation.findByIdAndUpdate(conversationId, { isSoftDeleted: true });
    
    const { getIO } = require('../sockets');
    const io = getIO();
    if (io) io.to(conversationId.toString()).emit('group_deleted', { conversationId });
  }
}

module.exports = new ChatService();
