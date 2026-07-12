const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const { protect } = require('../middlewares/authMiddleware');

router.use(protect);

router.get('/conversations', chatController.getMyConversations);
router.get('/conversations/:conversationId/messages', chatController.getMessages);
router.post('/direct', chatController.createDirect);
router.post('/channel', chatController.createChannel);
router.get('/directory', chatController.getChatDirectory);
router.post('/conversations/:conversationId/pin', chatController.pinConversation);
router.post('/conversations/:conversationId/mute', chatController.muteConversation);

// Group Management Routes
router.get('/conversations/:conversationId/members', chatController.getGroupMembers);
router.put('/conversations/:conversationId/info', chatController.updateGroupInfo);
router.post('/conversations/:conversationId/members', chatController.addGroupMembers);
router.delete('/conversations/:conversationId/members/:userId', chatController.removeGroupMember);
router.put('/conversations/:conversationId/members/:userId/role', chatController.updateMemberRole);
router.post('/conversations/:conversationId/leave', chatController.leaveGroup);
router.delete('/conversations/:conversationId', chatController.deleteGroup);

module.exports = router;
