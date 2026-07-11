const EmployeeService = require('../services/EmployeeService');
const { sendResponse } = require('../utils/apiResponse');

/**
 * @desc    Create new employee
 * @route   POST /api/employees
 * @access  Private/Admin
 */
const createEmployee = async (req, res, next) => {
  try {
    const { employee, tempPassword } = await EmployeeService.createEmployee(req.body, req.user._id);
    
    // In a real scenario, email the tempPassword to the employee
    sendResponse(res, 201, 'Employee created successfully', { employee, tempPassword });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all employees
 * @route   GET /api/employees
 * @access  Private/Admin
 */
const getEmployees = async (req, res, next) => {
  try {
    const employees = await EmployeeService.getAllEmployees();
    sendResponse(res, 200, 'Employees fetched successfully', { employees });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single employee
 * @route   GET /api/employees/:id
 * @access  Private/Admin
 */
const getEmployeeById = async (req, res, next) => {
  try {
    const employee = await EmployeeService.getEmployeeById(req.params.id);
    sendResponse(res, 200, 'Employee fetched successfully', { employee });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update employee
 * @route   PUT /api/employees/:id
 * @access  Private/Admin
 */
const updateEmployee = async (req, res, next) => {
  try {
    const employee = await EmployeeService.updateEmployee(req.params.id, req.body, req.user._id);
    sendResponse(res, 200, 'Employee updated successfully', { employee });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete employee (soft delete)
 * @route   DELETE /api/employees/:id
 * @access  Private/Admin
 */
const deleteEmployee = async (req, res, next) => {
  try {
    await EmployeeService.deleteEmployee(req.params.id, req.user._id);
    sendResponse(res, 200, 'Employee deleted successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update employee status
 * @route   PATCH /api/employees/:id/status
 * @access  Private/Admin
 */
const updateStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const employee = await EmployeeService.updateStatus(req.params.id, status, req.user._id);
    sendResponse(res, 200, 'Employee status updated', { employee });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Reset employee password
 * @route   PATCH /api/employees/:id/reset-password
 * @access  Private/Admin
 */
const resetPassword = async (req, res, next) => {
  try {
    const { tempPassword } = await EmployeeService.resetPassword(req.params.id, req.user._id);
    sendResponse(res, 200, 'Password reset successfully', { tempPassword });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createEmployee,
  getEmployees,
  getEmployeeById,
  updateEmployee,
  deleteEmployee,
  updateStatus,
  resetPassword
};
