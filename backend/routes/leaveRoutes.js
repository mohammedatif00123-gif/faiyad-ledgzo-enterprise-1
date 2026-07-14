const express = require('express');
const router = express.Router();
const { applyLeave, getMyLeaves, getPendingLeaves, updateLeaveStatus } = require('../controllers/leaveController');
const { protect, admin } = require('../middlewares/authMiddleware');

router.post('/apply', protect, applyLeave);
router.get('/my-leaves', protect, getMyLeaves);

// Admin routes
router.get('/admin/pending', protect, admin, getPendingLeaves);
router.put('/admin/:id/status', protect, admin, updateLeaveStatus);

module.exports = router;
