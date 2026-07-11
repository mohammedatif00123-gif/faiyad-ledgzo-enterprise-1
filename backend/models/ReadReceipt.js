const mongoose = require('mongoose');

const readReceiptSchema = new mongoose.Schema({
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
  lastReadMessage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
  },
  unreadCount: {
    type: Number,
    default: 0,
  }
}, {
  timestamps: true
});

// A user has one read receipt per conversation
readReceiptSchema.index({ conversation: 1, user: 1 }, { unique: true });

module.exports = mongoose.model('ReadReceipt', readReceiptSchema);
