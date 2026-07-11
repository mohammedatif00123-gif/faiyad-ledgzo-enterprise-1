const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const { login, logout, refresh, changePassword, getMe } = require('../controllers/authController');
const { protect } = require('../middlewares/authMiddleware');
const { validate } = require('../middlewares/validateMiddleware');
const { loginLimiter } = require('../middlewares/rateLimiter');

// Public Routes
router.post('/login', loginLimiter, [
  check('companyEmail', 'Please include a valid company email').isEmail(),
  check('password', 'Password is required').exists()
], validate, login);

router.post('/refresh', refresh);

// Protected Routes
router.post('/logout', protect, logout);

router.post('/change-password', protect, [
  check('currentPassword', 'Current password is required').exists(),
  check('newPassword', 'Please enter a new password with 6 or more characters').isLength({ min: 6 })
], validate, changePassword);

router.get('/me', protect, getMe);

module.exports = router;
