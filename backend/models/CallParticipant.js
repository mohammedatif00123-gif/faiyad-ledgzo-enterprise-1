const mongoose = require('mongoose');

const callParticipantSchema = new mongoose.Schema({
  callSession: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CallSession',
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  joinedAt: Date,
  leftAt: Date,
  muted: {
    type: Boolean,
    default: false
  },
  speaking: {
    type: Boolean,
    default: false
  },
  connectionState: {
    type: String,
    enum: ['new', 'checking', 'connected', 'completed', 'failed', 'disconnected', 'closed'],
    default: 'new'
  },
  device: {
    type: String,
    default: 'unknown'
  }
}, { timestamps: true });

module.exports = mongoose.model('CallParticipant', callParticipantSchema);
