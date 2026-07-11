const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./models/User');
const { ROLES, STATUSES } = require('./constants/index');
const connectDB = require('./config/db');

async function createAdmin() {
  try {
    await connectDB();
    
    // Check if admin already exists
    const existingAdmin = await User.findOne({ companyEmail: 'admin@ledgzo.com' });
    if (existingAdmin) {
      console.log('Admin already exists! Email: admin@ledgzo.com');
      process.exit(0);
    }

    const admin = new User({
      firstName: 'Admin',
      lastName: 'Ledgzo',
      companyEmail: 'admin@ledgzo.com',
      password: 'AdminPassword123!',
      role: ROLES.ADMIN,
      status: STATUSES.ACTIVE,
      employeeCode: 'ADM001',
      isVerified: true,
      mustChangePassword: false,
      isFirstLogin: false
    });

    await admin.save();
    console.log('Admin created successfully!');
    console.log('Email: admin@ledgzo.com');
    console.log('Password: AdminPassword123!');
    process.exit(0);
  } catch (error) {
    console.error('Error creating admin:', error);
    process.exit(1);
  }
}

createAdmin();
