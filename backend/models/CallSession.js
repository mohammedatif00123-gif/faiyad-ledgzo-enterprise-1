const mongoose = require('mongoose');

const callSessionSchema = new mongoose.Schema({
  conversation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true
  },
  initiatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  callType: {
    type: String,
    enum: ['voice', 'video', 'screen_share', 'meeting'],
    default: 'voice'
  },
  status: {
    type: String,
    enum: ['Ringing', 'Connecting', 'Reconnecting', 'Connected', 'On Hold', 'Muted', 'Busy', 'Rejected', 'Missed', 'Ended', 'Cancelled'],
    default: 'Ringing'
  },
  startedAt: Date,
  answeredAt: Date,
  endedAt: Date,
  duration: {
    type: Number,
    default: 0
  },
  endReason: {
    type: String,
    enum: ['completed', 'timeout', 'busy', 'rejected', 'cancelled', 'network_error', 'unknown']
  },
  
  videoEnabled: { type: Boolean, default: false },
  screenSharing: { type: Boolean, default: false },
  captionsEnabled: { type: Boolean, default: false },
  
  // Future architecture placeholders
  recordingStatus: {
    type: String,
    enum: ['none', 'recording', 'completed', 'failed'],
    default: 'none'
  },
  recordingUrl: String,
  transcriptionStatus: {
    type: String,
    enum: ['none', 'processing', 'completed', 'failed'],
    default: 'none'
  },
  transferredTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  transferredFrom: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  transferType: {
    type: String,
    enum: ['blind', 'consult', 'forward']
  }
}, { timestamps: true });

module.exports = mongoose.model('CallSession', callSessionSchema);
