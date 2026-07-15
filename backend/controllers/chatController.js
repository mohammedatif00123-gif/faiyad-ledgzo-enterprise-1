const ChatService = require('../services/ChatService');
const { sendResponse } = require('../utils/apiResponse');

exports.getMyConversations = async (req, res, next) => {
  try {
    const conversations = await ChatService.getMyConversations(req.user.id);
    sendResponse(res, 200, 'Conversations fetched successfully', conversations);
  } catch (error) {
    next(error);
  }
};

exports.getMessages = async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const { page, limit } = req.query;
    const messages = await ChatService.getMessages(conversationId, parseInt(page), parseInt(limit));
    sendResponse(res, 200, 'Messages fetched successfully', messages);
  } catch (error) {
    next(error);
  }
};

exports.createDirect = async (req, res, next) => {
  try {
    const { partnerId } = req.body;
    const conversation = await ChatService.createDirectConversation(req.user.id, partnerId);
    sendResponse(res, 201, 'Direct conversation created', conversation);
  } catch (error) {
    next(error);
  }
};

exports.createChannel = async (req, res, next) => {
  try {
    const { name, members, description, avatar, visibility, encryptedKeys } = req.body;
    const conversation = await ChatService.createChannel(req.user.id, name, members, { description, avatar, visibility, encryptedKeys });
    sendResponse(res, 201, 'Channel created', conversation);
  } catch (error) {
    next(error);
  }
};

exports.getChatDirectory = async (req, res, next) => {
  try {
    const User = require('../models/User');
    const Presence = require('../models/Presence');
    const Attendance = require('../models/Attendance');
    const Leave = require('../models/Leave');

    const users = await User.find({ status: 'Active' }).select('firstName lastName avatar role isOnline presenceStatus').lean();
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);

    const attendances = await Attendance.find({ date: { $gte: today } }).lean();
    const activeLeaves = await Leave.find({
      status: { $regex: /^approved$/i },
      fromDate: { $lte: endOfDay },
      toDate: { $gte: today }
    }).lean();

    const userIds = users.map(u => u._id);
    const presences = await Presence.find({ user: { $in: userIds } }).lean();
    
    const presenceMap = {};
    presences.forEach(p => {
      presenceMap[p.user.toString()] = p.status;
    });

    const enrichedUsers = users.map(u => {
      const att = attendances.find(a => a.employeeId && a.employeeId.toString() === u._id.toString());
      const isLeave = activeLeaves.find(l => l.employeeId && l.employeeId.toString() === u._id.toString());
      
      let finalStatus = 'Offline';
      if (isLeave) {
        finalStatus = 'On Leave';
      } else if (att && !att.checkOut) {
        // Checked in and not checked out
        const pStatus = u.presenceStatus || presenceMap[u._id.toString()];
        if (pStatus && pStatus.toLowerCase() !== 'offline') {
           finalStatus = pStatus.charAt(0).toUpperCase() + pStatus.slice(1);
        } else {
           finalStatus = 'Online';
        }
      }

      return {
        ...u,
        status: finalStatus,
        isOnline: finalStatus !== 'Offline' && finalStatus !== 'On Leave'
      };
    });

    sendResponse(res, 200, 'Directory fetched', enrichedUsers);
  } catch (error) {
    next(error);
  }
};

exports.getGroupMembers = async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const ConversationMember = require('../models/ConversationMember');
    
    // Check if user is part of the conversation (security)
    const isMember = await ConversationMember.findOne({ conversation: conversationId, user: req.user.id });
    if (!isMember) {
      return res.status(403).json({ success: false, message: 'Not a member of this conversation' });
    }
    
    const members = await ConversationMember.find({ conversation: conversationId })
      .populate('user', 'firstName lastName avatar email department companyEmail')
      .lean();
      
    sendResponse(res, 200, 'Group members fetched successfully', members);
  } catch (error) {
    next(error);
  }
};

exports.pinConversation = async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const { isPinned } = req.body;
    
    const ConversationMember = require('../models/ConversationMember');
    await ConversationMember.findOneAndUpdate(
      { conversation: conversationId, user: req.user.id },
      { isPinned },
      { returnDocument: 'after' }
    );
    
    sendResponse(res, 200, isPinned ? 'Conversation pinned' : 'Conversation unpinned', { isPinned });
  } catch (error) {
    next(error);
  }
};

exports.muteConversation = async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const { durationHours } = req.body; // e.g., 1, 8, 24, 168 (7 days), or -1 (Always)
    
    const ConversationMember = require('../models/ConversationMember');
    let notificationMuteUntil = null;
    let isMuted = false;
    
    if (durationHours === -1) {
      notificationMuteUntil = new Date('2099-12-31T23:59:59.999Z'); // Always
      isMuted = true;
    } else if (durationHours > 0) {
      notificationMuteUntil = new Date();
      notificationMuteUntil.setHours(notificationMuteUntil.getHours() + durationHours);
      isMuted = true;
    }
    
    await ConversationMember.findOneAndUpdate(
      { conversation: conversationId, user: req.user.id },
      { isMuted, notificationMuteUntil },
      { returnDocument: 'after' }
    );
    
    sendResponse(res, 200, isMuted ? 'Conversation muted' : 'Conversation unmuted', { isMuted, notificationMuteUntil });
  } catch (error) {
    next(error);
  }
};

exports.updateGroupInfo = async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const { name, description, avatar } = req.body;
    const conversation = await ChatService.updateGroupInfo(req.user.id, conversationId, { name, description, avatar });
    sendResponse(res, 200, 'Group info updated', conversation);
  } catch (error) {
    next(error);
  }
};

exports.addGroupMembers = async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const { memberIds, encryptedKeys } = req.body;
    const conversation = await ChatService.addGroupMembers(req.user.id, conversationId, memberIds, encryptedKeys);
    sendResponse(res, 200, 'Members added successfully', conversation);
  } catch (error) {
    next(error);
  }
};

exports.removeGroupMember = async (req, res, next) => {
  try {
    const { conversationId, userId } = req.params;
    const conversation = await ChatService.removeGroupMember(req.user.id, conversationId, userId);
    sendResponse(res, 200, 'Member removed successfully', conversation);
  } catch (error) {
    next(error);
  }
};

exports.updateMemberRole = async (req, res, next) => {
  try {
    const { conversationId, userId } = req.params;
    const { role } = req.body;
    const conversation = await ChatService.updateMemberRole(req.user.id, conversationId, userId, role);
    sendResponse(res, 200, 'Member role updated', conversation);
  } catch (error) {
    next(error);
  }
};

exports.resendGroupKey = async (req, res, next) => {
  try {
    const { conversationId, userId } = req.params;
    const { encryptedKey } = req.body;
    await ChatService.resendGroupKey(req.user.id, conversationId, userId, encryptedKey);
    sendResponse(res, 200, 'Group key resent successfully');
  } catch (error) {
    next(error);
  }
};

exports.reEncryptGroupKeys = async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const { keys } = req.body;
    await ChatService.reEncryptGroupKeys(req.user.id, conversationId, keys);
    sendResponse(res, 200, 'Group keys re-encrypted successfully');
  } catch (error) {
    next(error);
  }
};

exports.leaveGroup = async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    await ChatService.leaveGroup(req.user.id, conversationId);
    sendResponse(res, 200, 'Left group successfully', null);
  } catch (error) {
    next(error);
  }
};

exports.deleteGroup = async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    await ChatService.deleteGroup(req.user.id, conversationId);
    sendResponse(res, 200, 'Group deleted successfully', null);
  } catch (error) {
    next(error);
  }
};
