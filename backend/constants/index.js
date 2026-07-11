/**
 * Application Constants
 */
const ROLES = {
  ADMIN: 'Admin',
  EMPLOYEE: 'Employee'
};

const STATUSES = {
  ACTIVE: 'Active',
  INACTIVE: 'Inactive'
};

const CONFIG = {
  MAX_LOGIN_ATTEMPTS: 5,
  REFRESH_TOKEN_REMEMBER_DAYS: 30,
  REFRESH_TOKEN_DEFAULT_DAYS: 1,
  ACCESS_TOKEN_MINUTES: 15
};

module.exports = {
  ROLES,
  STATUSES,
  CONFIG
};
