const bcrypt = require('bcrypt');
const mongoose = require('mongoose');

mongoose.connect('mongodb://127.0.0.1:27017/ledgzo-enterprise').then(async () => {
  const db = mongoose.connection.db;
  
  const adminPass = await bcrypt.hash('Admin@123', 10);
  await db.collection('users').updateOne(
    { companyEmail: 'admin@ledgzo.com' },
    { $set: { password: adminPass, mustChangePassword: false, isFirstLogin: false, loginAttempts: 0 }, $unset: { lockUntil: 1 } }
  );

  const empPass = await bcrypt.hash('Employee@123', 10);
  await db.collection('users').updateOne(
    { companyEmail: 'test@ledgzo.com' },
    { $set: { password: empPass, mustChangePassword: false, isFirstLogin: false, loginAttempts: 0 }, $unset: { lockUntil: 1 } }
  );

  console.log('Passwords updated successfully');
  process.exit(0);
}).catch(console.error);
