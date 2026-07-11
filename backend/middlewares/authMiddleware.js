const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { UnauthorizedError, ForbiddenError } = require('../utils/errors');
const { ROLES, STATUSES } = require('../constants');

/**
 * Protect routes by verifying JWT access token
 */
const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(new UnauthorizedError('Not authorized, no token provided'));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return next(new UnauthorizedError('Not authorized, user not found'));
    }

    if (user.status === STATUSES.INACTIVE) {
      return next(new ForbiddenError('Your account has been deactivated'));
    }

    req.user = user;
    next();
  } catch (error) {
    next(new UnauthorizedError('Not authorized, token failed'));
  }
};

/**
 * Authorize only Admin users
 */
const admin = (req, res, next) => {
  if (req.user && req.user.role === ROLES.ADMIN) {
    next();
  } else {
    next(new ForbiddenError('Not authorized as an Admin'));
  }
};

module.exports = { protect, admin };
