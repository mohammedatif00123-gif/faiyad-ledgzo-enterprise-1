const { rateLimit } = require('express-rate-limit');

/**
 * Rate limiter for login endpoint to prevent brute force
 */
const loginLimiter = rateLimit({
  windowMs: 30 * 1000, // 30 seconds
  max: 10, // Limit each IP to 10 login requests per window
  message: {
    success: false,
    message: 'Too many login attempts from this IP, please try again after 30 seconds.'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

module.exports = {
  loginLimiter
};
