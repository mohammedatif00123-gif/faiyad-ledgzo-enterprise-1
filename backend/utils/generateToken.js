const jwt = require('jsonwebtoken');

/**
 * Generate Access Token
 * @param {string} id - User ID
 * @returns {string} JWT Token
 */
const generateAccessToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '15m'
  });
};

/**
 * Generate Refresh Token
 * @param {string} id - User ID
 * @param {boolean} rememberMe - Extend expiration if true
 * @returns {string} JWT Token
 */
const generateRefreshToken = (id, rememberMe = false) => {
  const expiresIn = rememberMe ? '30d' : '1d';
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn
  });
};

module.exports = {
  generateAccessToken,
  generateRefreshToken
};
