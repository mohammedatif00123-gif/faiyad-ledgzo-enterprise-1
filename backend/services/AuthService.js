const UserRepository = require('../repositories/UserRepository');
const { generateAccessToken, generateRefreshToken } = require('../utils/generateToken');
const { UnauthorizedError, BadRequestError } = require('../utils/errors');
const { CONFIG, STATUSES } = require('../constants');

class AuthService {
  /**
   * Handle user login logic
   */
  async login(companyEmail, password, rememberMe) {
    const user = await UserRepository.findByCompanyEmail(companyEmail);

    if (!user) {
      throw new UnauthorizedError('Invalid credentials');
    }

    if (user.status === STATUSES.INACTIVE) {
      throw new UnauthorizedError('Account is inactive. Please contact administrator.');
    }

    if (user.loginAttempts >= CONFIG.MAX_LOGIN_ATTEMPTS) {
      throw new UnauthorizedError('Account is temporarily locked due to too many failed attempts.');
    }

    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      await UserRepository.incrementLoginAttempts(user._id);
      throw new UnauthorizedError('Invalid credentials');
    }

    // Reset login attempts on successful login
    await UserRepository.resetLoginAttempts(user._id);

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id, rememberMe);

    // Remove password from returned user object
    user.password = undefined;

    return { user, accessToken, refreshToken };
  }

  /**
   * Refresh the access token
   */
  async refreshToken(user) {
    const accessToken = generateAccessToken(user._id);
    return { accessToken };
  }

  /**
   * Change Password
   */
  async changePassword(userId, currentPassword, newPassword) {
    const user = await UserRepository.findById(userId, '+password');
    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      throw new BadRequestError('Current password is incorrect');
    }

    user.password = newPassword;
    user.isFirstLogin = false;
    user.mustChangePassword = false;
    user.passwordChangedAt = new Date();
    await user.save();

    return true;
  }
}

module.exports = new AuthService();
