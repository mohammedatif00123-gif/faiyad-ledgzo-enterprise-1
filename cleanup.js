const mongoose = require('mongoose');
const CallParticipant = require('./backend/models/CallParticipant');
const CallSession = require('./backend/models/CallSession');
const Message = require('./backend/models/Message');

require('dotenv').config({ path: './backend/.env' });

async function cleanup() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to DB');

    // Cleanup stuck calls
    const res = await CallParticipant.updateMany({ leftAt: null }, { $set: { leftAt: new Date() } });
    console.log('Cleaned up participants:', res.modifiedCount);

    const res2 = await CallSession.updateMany({ status: { $in: ['Ringing', 'Connecting', 'Connected'] } }, { $set: { status: 'Ended', endedAt: new Date() } });
    console.log('Cleaned up sessions:', res2.modifiedCount);

    console.log('Done');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

cleanup();
