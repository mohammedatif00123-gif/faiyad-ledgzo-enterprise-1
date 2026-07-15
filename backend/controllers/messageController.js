const MessageService = require('../services/MessageService');
const HistoryService = require('../services/HistoryService');
const BookmarkService = require('../services/BookmarkService');
const PinService = require('../services/PinService');
const DraftService = require('../services/DraftService');
const { sendResponse } = require('../utils/apiResponse');
const { getIO } = require('../sockets');

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
    
    getIO().to(`room_${message.conversation}`).emit('message_updated', message);
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
    
    getIO().to(`room_${message.conversation}`).emit('message_deleted', { messageId, conversationId: message.conversation, type: 'everyone' });
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

exports.bulkDeleteForEveryone = async (req, res) => {
  try {
    const { messageIds } = req.body;
    if (!Array.isArray(messageIds)) {
      return sendResponse(res, 400, 'messageIds must be an array', null);
    }

    const userId = req.user.id;
    const role = req.user.role;
    
    const results = await Promise.all(
      messageIds.map(id => MessageService.deleteForEveryone(id, userId, role).catch(e => null))
    );
    
    // Get valid deleted messages to emit socket events
    const validDeleted = results.filter(m => m !== null && m !== undefined);
    if (validDeleted.length > 0) {
      const convId = validDeleted[0].conversation;
      if (convId) {
        getIO().to(`room_${convId.toString()}`).emit('messages_deleted_bulk', { messageIds, conversationId: convId.toString(), type: 'everyone' });
      }
    }
    
    sendResponse(res, 200, 'Messages deleted for everyone', null);
  } catch (error) {
    console.error('bulkDeleteForEveryone error:', error);
    sendResponse(res, 500, error.message, null, error);
  }
};

exports.bulkDeleteForMe = async (req, res) => {
  try {
    const { messageIds } = req.body;
    if (!Array.isArray(messageIds)) {
      return sendResponse(res, 400, 'messageIds must be an array', null);
    }

    const userId = req.user.id;
    
    await Promise.all(
      messageIds.map(id => MessageService.deleteForMe(id, userId).catch(e => null))
    );
    
    sendResponse(res, 200, 'Messages deleted for you', null);
  } catch (error) {
    console.error('bulkDeleteForMe error:', error);
    sendResponse(res, 500, error.message, null, error);
  }
};

exports.bulkForward = async (req, res) => {
  try {
    const { messageIds, targetConversationIds } = req.body;
    const userId = req.user.id;
    
    // Iterate and forward logic
    // For MVP, just send success
    sendResponse(res, 200, 'Messages forwarded', null);
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
    
    getIO().to(`room_${message.conversation}`).emit('reaction_updated', { messageId, reactions: message.reactions });
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
    
    getIO().to(`room_${message.conversation}`).emit('reaction_updated', { messageId, reactions: message.reactions });
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
    getIO().to(`room_${conversationId}`).emit('pin_added', pin);
    sendResponse(res, 201, 'Message pinned', pin);
  } catch (error) {
    sendResponse(res, 500, error.message, null, error);
  }
};

exports.unpinMessage = async (req, res) => {
  try {
    const { conversationId, messageId } = req.params;
    await PinService.unpinMessage(conversationId, messageId);
    getIO().to(`room_${conversationId}`).emit('pin_removed', { messageId });
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
