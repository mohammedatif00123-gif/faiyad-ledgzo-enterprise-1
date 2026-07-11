const mongoose = require('mongoose');

const conversationMemberSchema = new mongoose.Schema({
  conversation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  role: {
    type: String,
    enum: ['owner', 'admin', 'member'],
    default: 'member',
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'active'],
    default: 'active'
  },
  addedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  removedAt: {
    type: Date,
    default: null
  },
  lastSeenAt: {
    type: Date,
    default: null
  },
  lastDeliveredAt: {
    type: Date,
    default: null
  },
  notificationMuteUntil: {
    type: Date,
    default: null
  },
  joinedAt: {
    type: Date,
    default: Date.now,
  },
  isMuted: {
    type: Boolean,
    default: false,
  }
}, {
  timestamps: true
});

// Ensure a user is only added once to a conversation
conversationMemberSchema.index({ conversation: 1, user: 1 }, { unique: true });

module.exports = mongoose.model('ConversationMember', conversationMemberSchema);
