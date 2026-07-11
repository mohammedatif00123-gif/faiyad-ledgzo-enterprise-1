const express = require('express');
const router = express.Router();
const { startWork, endWork, breakStart, breakEnd, getMyToday, getMyHistory, getAllAttendance } = require('../controllers/attendanceController');
const { protect, admin } = require('../middlewares/authMiddleware');

router.use(protect);

// Employee routes
router.post('/start', startWork);
router.post('/end', endWork);
router.post('/break/start', breakStart);
router.post('/break/end', breakEnd);
router.get('/me/today', getMyToday);
router.get('/me/history', getMyHistory);

// Admin routes
router.use(admin);
router.get('/', getAllAttendance);

module.exports = router;
