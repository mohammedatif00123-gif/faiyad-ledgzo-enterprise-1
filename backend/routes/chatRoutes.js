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

module.exports = router;
