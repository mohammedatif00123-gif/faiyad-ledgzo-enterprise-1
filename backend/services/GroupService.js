const Conversation = require('../models/Conversation');
const ConversationMember = require('../models/ConversationMember');
const Message = require('../models/Message');
const AuditLog = require('../models/AuditLog');
const crypto = require('crypto');

class GroupService {
  async createSystemMessage(conversationId, content, systemAction, req = {}) {
    try {
      // Find a generic system user or use the actor
      // Assuming system messages don't technically need a 'sender' but schema requires it.
      // We'll use the creator/actor if available, or a fallback admin user.
      const sender = req.user ? req.user.id : null; 
      if (!sender) return null;

      const message = new Message({
        conversation: conversationId,
        sender,
        content,
        messageType: 'system',
        systemAction
      });

      await message.save();
      
      // Update conversation latest message
      await Conversation.findByIdAndUpdate(conversationId, { updatedAt: new Date() });
      
      return message;
    } catch (err) {
      console.error('System message error:', err);
      return null;
    }
  }

  async logAudit(req, targetId, targetModel, action, oldValue = null, newValue = null) {
    try {
      if (!req.user) return;
      await AuditLog.create({
        actor: req.user.id,
        entity: targetModel,
        entityId: targetId,
        action,
        previousValue: oldValue,
        newValue,
        ipAddress: req.ip,
        device: req.headers['user-agent']
      });
    } catch (err) {
      console.error('Audit log error:', err);
    }
  }

  async createGroup(data, req) {
    const { name, description, memberIds = [], visibility, permissionsMatrix, avatar, encryptedKeys } = data;
    const creatorId = req.user.id;
    
    // 1. Validate encryptedKeys (E2EE)
    const uniqueMemberIds = [...new Set(memberIds)].filter(id => id.toString() !== creatorId.toString());
    const totalExpectedMembers = uniqueMemberIds.length + 1; // Including creator
    
    if (encryptedKeys) {
      if (!Array.isArray(encryptedKeys)) {
        throw new Error('encryptedKeys must be an array');
      }
      if (encryptedKeys.length !== totalExpectedMembers) {
        throw new Error(`Invalid encryptedKeys count. Expected ${totalExpectedMembers}, got ${encryptedKeys.length}`);
      }
      
      const providedKeyUserIds = new Set();
      for (const keyObj of encryptedKeys) {
        if (!keyObj.user || !keyObj.encryptedKey || !keyObj.encryptedKey.iv || !keyObj.encryptedKey.ciphertext) {
          throw new Error('Invalid encryptedKey structure. Missing user, iv, or ciphertext.');
        }
        providedKeyUserIds.add(keyObj.user.toString());
      }
      
      // Ensure the creator and all unique members are in the providedKeyUserIds
      if (!providedKeyUserIds.has(creatorId.toString())) {
        throw new Error('encryptedKeys must include a key for the creator');
      }
      for (const memberId of uniqueMemberIds) {
        if (!providedKeyUserIds.has(memberId.toString())) {
          throw new Error(`encryptedKeys missing key for member ${memberId}`);
        }
      }
    }

    const mongoose = require('mongoose');
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      console.debug('[E2EE-Group] Validating and processing group creation...');
      
      const conversation = new Conversation({
        name,
        description,
        type: 'channel', // Using channel for groups
        visibility: visibility || 'private',
        permissionsMatrix,
        avatar,
        createdBy: creatorId,
        inviteLink: require('crypto').randomBytes(16).toString('hex'),
        memberCount: totalExpectedMembers
      });

      await conversation.save({ session });

      const membersToInsert = [{
        conversation: conversation._id,
        user: creatorId,
        role: 'owner',
        status: 'active',
        addedBy: creatorId
      }];

      if (uniqueMemberIds.length > 0) {
        uniqueMemberIds.forEach(id => {
          membersToInsert.push({
            conversation: conversation._id,
            user: id,
            role: 'member',
            status: 'active',
            addedBy: creatorId
          });
        });
      }

      await ConversationMember.insertMany(membersToInsert, { session });

      if (encryptedKeys && encryptedKeys.length > 0) {
        console.debug(`[E2EE-Group] Inserting ${encryptedKeys.length} GroupKey records...`);
        const GroupKey = require('../models/GroupKey');
        const keysToInsert = encryptedKeys.map(ek => ({
          conversation: conversation._id,
          user: ek.user,
          encryptedKey: ek.encryptedKey,
          encryptedBy: creatorId,
          version: 1
        }));
        await GroupKey.insertMany(keysToInsert, { session });
      } else {
        console.warn(`[E2EE-Group] WARNING: Group created without encryptedKeys! (conversationId: ${conversation._id})`);
      }

      await session.commitTransaction();
      session.endSession();

      await this.logAudit(req, conversation._id, 'Conversation', 'CREATE_GROUP', null, { name, visibility });
      
      await this.createSystemMessage(
        conversation._id, 
        `${req.user.firstName} created the group.`, 
        'GROUP_CREATED', 
        req
      );

      return conversation;
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      console.error('[E2EE-Group] Transaction rolled back due to error:', error);
      throw error;
    }
  }



  async addMembers(conversationId, newMemberIds, req) {
    // Check permission
    const actorMember = await ConversationMember.findOne({ conversation: conversationId, user: req.user.id });
    if (!actorMember || actorMember.status !== 'active') throw new Error('Not a member');
    
    const group = await Conversation.findById(conversationId);
    if (!group) throw new Error('Group not found');

    if (group.permissionsMatrix?.adminsOnlyAddMembers && !['owner', 'admin'].includes(actorMember.role)) {
      throw new Error('Only admins can add members');
    }

    // Filter out duplicates and already existing members
    const uniqueNewMemberIds = [...new Set(newMemberIds)];
    const existingMembers = await ConversationMember.find({ conversation: conversationId, user: { $in: uniqueNewMemberIds } });
    const existingMemberIds = existingMembers.map(m => m.user.toString());
    const idsToInsert = uniqueNewMemberIds.filter(id => !existingMemberIds.includes(id.toString()));

    if (idsToInsert.length === 0) return group;

    const membersToInsert = idsToInsert.map(id => ({
      conversation: conversationId,
      user: id,
      role: 'member',
      status: 'active',
      addedBy: req.user.id
    }));

    await ConversationMember.insertMany(membersToInsert);
    
    group.memberCount += idsToInsert.length;
    await group.save();

    await this.logAudit(req, conversationId, 'Conversation', 'ADD_MEMBERS', null, { count: idsToInsert.length });
    
    await this.createSystemMessage(
      conversationId,
      `${req.user.firstName} added ${idsToInsert.length} participants.`,
      'MEMBER_ADDED',
      req
    );

    return group;
  }

  async transferOwnership(conversationId, currentOwnerId) {
    // Find oldest admin
    let nextOwner = await ConversationMember.findOne({ 
      conversation: conversationId, 
      role: 'admin', 
      status: 'active',
      user: { $ne: currentOwnerId }
    }).sort({ joinedAt: 1 });

    // If no admin, find oldest member
    if (!nextOwner) {
      nextOwner = await ConversationMember.findOne({ 
        conversation: conversationId, 
        role: 'member', 
        status: 'active',
        user: { $ne: currentOwnerId } 
      }).sort({ joinedAt: 1 });
    }

    if (nextOwner) {
      nextOwner.role = 'owner';
      await nextOwner.save();
      return nextOwner.user;
    }
    return null;
  }

  async leaveGroup(conversationId, req) {
    const member = await ConversationMember.findOne({ conversation: conversationId, user: req.user.id });
    if (!member || member.status !== 'active') throw new Error('Not a member');

    member.status = 'rejected'; // essentially left
    member.removedAt = new Date();
    await member.save();

    const group = await Conversation.findById(conversationId);
    group.memberCount = Math.max(0, group.memberCount - 1);
    await group.save();

    let newOwnerId = null;
    if (member.role === 'owner') {
      newOwnerId = await this.transferOwnership(conversationId, req.user.id);
    }

    await this.logAudit(req, conversationId, 'Conversation', 'LEAVE_GROUP');
    
    await this.createSystemMessage(
      conversationId,
      `${req.user.firstName} left the group.`,
      'MEMBER_LEFT',
      req
    );

    if (newOwnerId) {
      // Create system message for ownership transfer, ideally with name, but we only have ID here
      // For now, emitting generic
      await this.createSystemMessage(
        conversationId,
        `Ownership transferred.`,
        'OWNER_CHANGED',
        req
      );
    }

    return { success: true, newOwnerId };
  }
}

module.exports = new GroupService();
