const mongoose = require('mongoose');

const presenceSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  status: {
    type: String,
    enum: ['Online', 'Working', 'On Break', 'In Meeting', 'In Call', 'In Video Call', 'Screen Sharing', 'Away', 'Offline'],
    default: 'Offline'
  },
  lastSeen: {
    type: Date,
    default: Date.now
  },
  currentSessionStart: {
    type: Date
  },
  socketId: {
    type: String
  }
}, { timestamps: true });

module.exports = mongoose.model('Presence', presenceSchema);
