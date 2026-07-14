const express = require('express');
const router = express.Router();
const Holiday = require('../models/Holiday');
const { protect } = require('../middlewares/authMiddleware');

router.get('/', protect, async (req, res) => {
  try {
    const holidays = await Holiday.find().sort({ date: 1 });
    res.json({ success: true, data: holidays });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
