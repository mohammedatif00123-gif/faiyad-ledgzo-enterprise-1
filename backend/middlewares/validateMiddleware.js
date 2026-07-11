const { validationResult } = require('express-validator');
const { sendResponse } = require('../utils/apiResponse');

/**
 * Middleware to format and return express-validator errors
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // Format errors to be a clean object { field: 'Message' }
    const formattedErrors = errors.array().reduce((acc, err) => {
      acc[err.path] = err.msg;
      return acc;
    }, {});

    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: formattedErrors
    });
  }
  next();
};

module.exports = { validate };
