const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const db = mongoose.connection.db;
  
  const adminPass = await bcrypt.hash('Admin@123', 10);
  await db.collection('users').updateOne(
    { companyEmail: 'admin@ledgzo.com' },
    { $set: { password: adminPass, mustChangePassword: false, isFirstLogin: false, loginAttempts: 0 }, $unset: { lockUntil: 1 } }
  );

  console.log('Fixed! Password is now Admin@123');
  process.exit(0);
}).catch(console.error);
