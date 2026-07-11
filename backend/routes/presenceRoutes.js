const express = require('express');
const router = express.Router();
const { getMyPresence, getWorkforcePresence, getDashboardMetrics } = require('../controllers/presenceController');
const { protect, admin } = require('../middlewares/authMiddleware');

router.use(protect);

router.get('/me', getMyPresence);

router.use(admin);
router.get('/workforce', getWorkforcePresence);
router.get('/metrics', getDashboardMetrics);

module.exports = router;
