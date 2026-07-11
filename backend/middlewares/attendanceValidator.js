const { check } = require('express-validator');

exports.validateAttendanceUpdate = [
  check('status', 'Status must be a valid string').optional().isString(),
];
