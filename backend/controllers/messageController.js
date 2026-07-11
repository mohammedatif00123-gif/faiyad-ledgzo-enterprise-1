const MessageService = require('../services/MessageService');
const HistoryService = require('../services/HistoryService');
const BookmarkService = require('../services/BookmarkService');
const PinService = require('../services/PinService');
const DraftService = require('../services/DraftService');
const { sendResponse } = require('../utils/apiResponse');
const { getIo } = require('../sockets');

exports.getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const pageNum = req.query.page ? parseInt(req.query.page) : 1;
    const limitNum = req.query.limit ? parseInt(req.query.limit) : 50;
    const messages = await MessageService.getMessages(conversationId, pageNum, limitNum);
    sendResponse(res, 200, 'Messages retrieved', messages);
  } catch (error) {
    sendResponse(res, 500, error.message, null, error);
  }
};

exports.getReplies = async (req, res) => {
  try {
    const { threadRootId } = req.params;
    const pageNum = req.query.page ? parseInt(req.query.page) : 1;
    const limitNum = req.query.limit ? parseInt(req.query.limit) : 50;
    const replies = await MessageService.getReplies(threadRootId, pageNum, limitNum);
    sendResponse(res, 200, 'Replies retrieved', replies);
  } catch (error) {
    sendResponse(res, 500, error.message, null, error);
  }
};

exports.editMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { content, reason } = req.body;
    const userId = req.user.id;
    const message = await MessageService.editMessage(messageId, userId, content, reason);
    
    getIo().to(`room_${message.conversation}`).emit('message_updated', message);
    sendResponse(res, 200, 'Message updated', message);
  } catch (error) {
    sendResponse(res, 500, error.message, null, error);
  }
};

exports.deleteForEveryone = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.id;
    const message = await MessageService.deleteForEveryone(messageId, userId, req.user.role);
    
    getIo().to(`room_${message.conversation}`).emit('message_deleted', { messageId, type: 'everyone' });
    sendResponse(res, 200, 'Message deleted for everyone', message);
  } catch (error) {
    sendResponse(res, 500, error.message, null, error);
  }
};

exports.deleteForMe = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.id;
    await MessageService.deleteForMe(messageId, userId);
    sendResponse(res, 200, 'Message deleted for you', null);
  } catch (error) {
    sendResponse(res, 500, error.message, null, error);
  }
};

exports.addReaction = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { emoji } = req.body;
    const userId = req.user.id;
    const message = await MessageService.addReaction(messageId, emoji, userId);
    
    getIo().to(`room_${message.conversation}`).emit('reaction_updated', { messageId, reactions: message.reactions });
    sendResponse(res, 200, 'Reaction added', message.reactions);
  } catch (error) {
    sendResponse(res, 500, error.message, null, error);
  }
};

exports.removeReaction = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { emoji } = req.body;
    const userId = req.user.id;
    const message = await MessageService.removeReaction(messageId, emoji, userId);
    
    getIo().to(`room_${message.conversation}`).emit('reaction_updated', { messageId, reactions: message.reactions });
    sendResponse(res, 200, 'Reaction removed', message.reactions);
  } catch (error) {
    sendResponse(res, 500, error.message, null, error);
  }
};

exports.getMessageHistory = async (req, res) => {
  try {
    const { messageId } = req.params;
    const history = await HistoryService.getMessageHistory(messageId);
    sendResponse(res, 200, 'Message history retrieved', history);
  } catch (error) {
    sendResponse(res, 500, error.message, null, error);
  }
};

exports.addBookmark = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { note } = req.body;
    const userId = req.user.id;
    const bookmark = await BookmarkService.addBookmark(userId, messageId, note);
    sendResponse(res, 201, 'Bookmark added', bookmark);
  } catch (error) {
    sendResponse(res, 500, error.message, null, error);
  }
};

exports.removeBookmark = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.id;
    await BookmarkService.removeBookmark(userId, messageId);
    sendResponse(res, 200, 'Bookmark removed', null);
  } catch (error) {
    sendResponse(res, 500, error.message, null, error);
  }
};

exports.pinMessage = async (req, res) => {
  try {
    const { conversationId, messageId } = req.params;
    const userId = req.user.id;
    const pin = await PinService.pinMessage(conversationId, messageId, userId);
    getIo().to(`room_${conversationId}`).emit('pin_added', pin);
    sendResponse(res, 201, 'Message pinned', pin);
  } catch (error) {
    sendResponse(res, 500, error.message, null, error);
  }
};

exports.unpinMessage = async (req, res) => {
  try {
    const { conversationId, messageId } = req.params;
    await PinService.unpinMessage(conversationId, messageId);
    getIo().to(`room_${conversationId}`).emit('pin_removed', { messageId });
    sendResponse(res, 200, 'Message unpinned', null);
  } catch (error) {
    sendResponse(res, 500, error.message, null, error);
  }
};

exports.saveDraft = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { content, parentMessage } = req.body;
    const userId = req.user.id;
    const draft = await DraftService.saveDraft(userId, conversationId, content, parentMessage);
    sendResponse(res, 200, 'Draft saved', draft);
  } catch (error) {
    sendResponse(res, 500, error.message, null, error);
  }
};

exports.getDrafts = async (req, res) => {
  try {
    const userId = req.user.id;
    const drafts = await DraftService.getDrafts(userId);
    sendResponse(res, 200, 'Drafts retrieved', drafts);
  } catch (error) {
    sendResponse(res, 500, error.message, null, error);
  }
};

exports.deleteDraft = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { parentMessage } = req.query;
    const userId = req.user.id;
    await DraftService.deleteDraft(userId, conversationId, parentMessage);
    sendResponse(res, 200, 'Draft deleted', null);
  } catch (error) {
    sendResponse(res, 500, error.message, null, error);
  }
};
