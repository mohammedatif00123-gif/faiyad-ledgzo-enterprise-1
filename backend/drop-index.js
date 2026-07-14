require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    try {
      const db = mongoose.connection.db;
      const collection = db.collection('attendances');
      await collection.dropIndex('user_1_attendanceDate_1');
      console.log('Successfully dropped the offending index!');
    } catch (e) {
      console.error('Error dropping index:', e.message);
    }
    process.exit(0);
  })
  .catch(console.error);
