/**
 * Standard API Response format
 * @param {Object} res - Express response object
 * @param {number} statusCode - HTTP status code
 * @param {string} message - Response message
 * @param {Object|null} data - Payload data
 */
const sendResponse = (res, statusCode, message, data = null) => {
  const success = statusCode >= 200 && statusCode < 300;
  
  res.status(statusCode).json({
    success,
    message,
    data
  });
};

module.exports = {
  sendResponse
};
