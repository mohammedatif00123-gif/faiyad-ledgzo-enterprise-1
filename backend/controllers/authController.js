const AuthService = require('../services/AuthService');
const { sendResponse } = require('../utils/apiResponse');
const { CONFIG } = require('../constants');

/**
 * @desc    Auth user & get token
 * @route   POST /api/auth/login
 * @access  Public
 */
const login = async (req, res, next) => {
  try {
    const { companyEmail, password, rememberMe } = req.body;

    const { user, accessToken, refreshToken } = await AuthService.login(companyEmail, password, rememberMe);

    // Set refresh token in HTTP-only cookie
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: (rememberMe ? CONFIG.REFRESH_TOKEN_REMEMBER_DAYS : CONFIG.REFRESH_TOKEN_DEFAULT_DAYS) * 24 * 60 * 60 * 1000
    };

    res.cookie('jwt', refreshToken, cookieOptions);

    sendResponse(res, 200, 'Login successful', { user, accessToken });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Logout user / clear cookie
 * @route   POST /api/auth/logout
 * @access  Private
 */
const logout = async (req, res, next) => {
  try {
    res.cookie('jwt', '', {
      httpOnly: true,
      expires: new Date(0)
    });

    sendResponse(res, 200, 'Logged out successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Refresh access token
 * @route   POST /api/auth/refresh
 * @access  Private (Refresh token)
 */
const refresh = async (req, res, next) => {
  try {
    const refreshToken = req.cookies.jwt;
    if (!refreshToken) {
      return res.status(401).json({ success: false, message: 'Not authorized, no refresh token' });
    }

    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
    
    // Attach minimal user object for service
    const user = { _id: decoded.id };
    const { accessToken } = await AuthService.refreshToken(user);

    sendResponse(res, 200, 'Token refreshed', { accessToken });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Change password
 * @route   POST /api/auth/change-password
 * @access  Private
 */
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    await AuthService.changePassword(req.user._id, currentPassword, newPassword);

    sendResponse(res, 200, 'Password changed successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get user profile
 * @route   GET /api/auth/me
 * @access  Private
 */
const getMe = async (req, res, next) => {
  try {
    sendResponse(res, 200, 'User profile fetched', { user: req.user });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update user profile
 * @route   PUT /api/auth/profile
 * @access  Private
 */
const updateProfile = async (req, res, next) => {
  try {
    const User = require('../models/User');
    const { firstName, lastName, phone, personalEmail, emergencyContact } = req.body;
    
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.firstName = firstName || user.firstName;
    user.lastName = lastName || user.lastName;
    user.phone = phone || user.phone;
    user.personalEmail = personalEmail || user.personalEmail;
    user.emergencyContact = emergencyContact || user.emergencyContact;

    const updatedUser = await user.save();
    
    // Convert to regular object and remove password
    const userObj = updatedUser.toObject();
    delete userObj.password;
    
    sendResponse(res, 200, 'Profile updated successfully', userObj);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  login,
  logout,
  refresh,
  changePassword,
  getMe,
  updateProfile
};
