const UserRepository = require('../repositories/UserRepository');
const { BadRequestError, NotFoundError } = require('../utils/errors');
const { ROLES } = require('../constants');

class EmployeeService {
  /**
   * Generate sequential employee code
   */
  async _generateEmployeeCode() {
    // Find the user with the highest employeeCode
    const lastEmployee = await UserRepository.model.findOne({}, 'employeeCode', { sort: { employeeCode: -1 } });
    
    if (!lastEmployee || !lastEmployee.employeeCode) {
      return 'LEDG001';
    }

    // Extract the number part from LEDGXXX
    const lastNumberStr = lastEmployee.employeeCode.replace('LEDG', '');
    const lastNumber = parseInt(lastNumberStr, 10);
    
    if (isNaN(lastNumber)) {
      // Fallback if there's a weird format in DB
      const count = await UserRepository.count();
      return `LEDG${String(count + 1).padStart(3, '0')}`;
    }

    return `LEDG${String(lastNumber + 1).padStart(3, '0')}`;
  }

  /**
   * Create an employee
   */
  async createEmployee(data, adminId) {
    const existing = await UserRepository.findByCompanyEmail(data.companyEmail);
    if (existing) {
      throw new BadRequestError('Company email is already in use');
    }

    const employeeCode = await this._generateEmployeeCode();
    
    // Use provided password or generate temporary password
    const tempPassword = data.password || Math.random().toString(36).slice(-8);

    const newEmployee = await UserRepository.create({
      ...data,
      employeeCode,
      password: tempPassword,
      role: ROLES.EMPLOYEE,
      isFirstLogin: true,
      mustChangePassword: true,
      createdBy: adminId
    });

    // TODO: Trigger Email Service to send tempPassword to user

    newEmployee.password = undefined; // Don't return hash
    return { employee: newEmployee, tempPassword };
  }

  /**
   * Get all employees
   */
  async getAllEmployees(query = {}) {
    return await UserRepository.find({ ...query, deletedAt: null }, '-password', { createdAt: -1 });
  }

  /**
   * Get employee by ID
   */
  async getEmployeeById(id) {
    const employee = await UserRepository.findById(id, '-password');
    if (!employee) {
      throw new NotFoundError('Employee not found');
    }
    return employee;
  }

  /**
   * Update employee
   */
  async updateEmployee(id, data, adminId) {
    const employee = await UserRepository.findById(id);
    if (!employee) {
      throw new NotFoundError('Employee not found');
    }

    data.updatedBy = adminId;
    const updated = await UserRepository.updateById(id, data);
    updated.password = undefined;
    return updated;
  }

  /**
   * Update employee status
   */
  async updateStatus(id, status, adminId) {
    return await this.updateEmployee(id, { status }, adminId);
  }

  /**
   * Reset employee password (Admin action)
   */
  async resetPassword(id, adminId) {
    const employee = await UserRepository.findById(id);
    if (!employee) {
      throw new NotFoundError('Employee not found');
    }

    const tempPassword = Math.random().toString(36).slice(-8);
    employee.password = tempPassword;
    employee.isFirstLogin = true;
    employee.mustChangePassword = true;
    employee.updatedBy = adminId;
    
    await employee.save();

    // TODO: Trigger Email Service to send tempPassword to user

    return { tempPassword };
  }

  /**
   * Delete (Hard delete)
   */
  async deleteEmployee(id, adminId) {
    const employee = await UserRepository.findById(id);
    if (!employee) {
      throw new NotFoundError('Employee not found');
    }
    return await UserRepository.deleteById(id);
  }
}

module.exports = new EmployeeService();
