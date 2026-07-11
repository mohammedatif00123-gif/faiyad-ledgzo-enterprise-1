const express = require('express');
const router = express.Router();
const searchController = require('../controllers/searchController');
const { protect } = require('../middlewares/authMiddleware');

router.use(protect);
router.get('/', searchController.search);

module.exports = router;
