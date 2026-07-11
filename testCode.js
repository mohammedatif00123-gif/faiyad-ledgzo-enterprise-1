const mongoose = require('mongoose');
const User = require('./backend/models/User');
const EmployeeService = require('./backend/services/EmployeeService');

async function test() {
  await mongoose.connect('mongodb://127.0.0.1:27017/ledgzo-enterprise');
  const code = await EmployeeService._generateEmployeeCode();
  console.log('Next Employee Code:', code);
  process.exit(0);
}
test();
