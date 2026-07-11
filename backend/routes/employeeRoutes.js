const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const { 
  createEmployee, 
  getEmployees, 
  getEmployeeById, 
  updateEmployee, 
  deleteEmployee, 
  updateStatus, 
  resetPassword 
} = require('../controllers/employeeController');
const { protect, admin } = require('../middlewares/authMiddleware');
const { validate } = require('../middlewares/validateMiddleware');
const { STATUSES } = require('../constants');

// All employee routes are protected and admin-only
router.use(protect);
router.use(admin);

router.route('/')
  .post([
    check('firstName', 'First name is required').not().isEmpty(),
    check('lastName', 'Last name is required').not().isEmpty(),
    check('companyEmail', 'Please include a valid company email').isEmail()
  ], validate, createEmployee)
  .get(getEmployees);

router.route('/:id')
  .get(getEmployeeById)
  .put([
    check('firstName', 'First name is required').optional().not().isEmpty(),
    check('lastName', 'Last name is required').optional().not().isEmpty(),
  ], validate, updateEmployee)
  .delete(deleteEmployee);

router.patch('/:id/status', [
  check('status', 'Invalid status').isIn(Object.values(STATUSES))
], validate, updateStatus);

router.patch('/:id/reset-password', resetPassword);

module.exports = router;
