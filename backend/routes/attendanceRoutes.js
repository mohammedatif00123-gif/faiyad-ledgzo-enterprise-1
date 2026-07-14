const express = require('express');
const router = express.Router();
const { checkIn, checkOut, getTodayAttendance, getAllAttendance, getMyHistory, getOnLeaveToday, toggleBreak } = require('../controllers/attendanceController');
const { protect, admin } = require('../middlewares/authMiddleware');

router.post('/check-in', protect, checkIn);
router.post('/check-out', protect, checkOut);
router.post('/break', protect, toggleBreak);
router.get('/today', protect, getTodayAttendance);
router.get('/history', protect, getMyHistory);
router.get('/on-leave-today', protect, getOnLeaveToday);

// Admin routes
router.get('/admin/all', protect, admin, getAllAttendance);

module.exports = router;
