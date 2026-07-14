const express = require('express');
const router = express.Router();
const keyController = require('../controllers/keyController');
const { protect } = require('../middlewares/authMiddleware');

router.use(protect);

router.post('/upload', keyController.uploadPublicKey);
router.get('/me', keyController.getMyPublicKeys);
router.get('/group/:conversationId', keyController.getGroupKey);
router.get('/:userId', keyController.getPublicKeys);

module.exports = router;
