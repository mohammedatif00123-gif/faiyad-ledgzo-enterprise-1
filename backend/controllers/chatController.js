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
    const { name, members } = req.body;
    const conversation = await ChatService.createChannel(req.user.id, name, members);
    sendResponse(res, 201, 'Channel created', conversation);
  } catch (error) {
    next(error);
  }
};

exports.getChatDirectory = async (req, res, next) => {
  try {
    const User = require('../models/User');
    const Presence = require('../models/Presence');
    const users = await User.find({ status: 'Active' }).select('firstName lastName avatar role isOnline').lean();
    
    const userIds = users.map(u => u._id);
    const presences = await Presence.find({ user: { $in: userIds } }).lean();
    
    const presenceMap = {};
    presences.forEach(p => {
      presenceMap[p.user.toString()] = p.status;
    });

    const enrichedUsers = users.map(u => ({
      ...u,
      status: presenceMap[u._id.toString()] || (u.isOnline ? 'Online' : 'Offline')
    }));

    sendResponse(res, 200, 'Directory fetched', enrichedUsers);
  } catch (error) {
    next(error);
  }
};
