const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');
const { protect } = require('../middlewares/authMiddleware');

router.use(protect);

// Message retrieval
router.get('/conversation/:conversationId', messageController.getMessages);
router.get('/thread/:threadRootId', messageController.getReplies);

// Message actions
router.put('/:messageId', messageController.editMessage);
router.post('/bulk-delete-everyone', messageController.bulkDeleteForEveryone);
router.post('/bulk-delete-me', messageController.bulkDeleteForMe);
router.post('/bulk-forward', messageController.bulkForward);
router.delete('/:messageId/everyone', messageController.deleteForEveryone);
router.delete('/:messageId/me', messageController.deleteForMe);

// Reactions
router.post('/:messageId/reactions', messageController.addReaction);
router.delete('/:messageId/reactions', messageController.removeReaction);

// History
router.get('/:messageId/history', messageController.getMessageHistory);
router.get('/:messageId/info', messageController.getMessageInfo);

// Bookmarks
router.post('/:messageId/bookmarks', messageController.addBookmark);
router.delete('/:messageId/bookmarks', messageController.removeBookmark);

// Pins
router.post('/conversation/:conversationId/messages/:messageId/pin', messageController.pinMessage);
router.delete('/conversation/:conversationId/messages/:messageId/pin', messageController.unpinMessage);

// Drafts
router.get('/drafts', messageController.getDrafts);
router.post('/conversation/:conversationId/drafts', messageController.saveDraft);
router.delete('/conversation/:conversationId/drafts', messageController.deleteDraft);

module.exports = router;
