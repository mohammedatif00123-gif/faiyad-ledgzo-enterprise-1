const mongoose = require('mongoose');

const pinnedMessageSchema = new mongoose.Schema({
  conversation: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true },
  message: { type: mongoose.Schema.Types.ObjectId, ref: 'Message', required: true },
  pinnedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  pinnedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

pinnedMessageSchema.index({ conversation: 1, message: 1 }, { unique: true });

module.exports = mongoose.model('PinnedMessage', pinnedMessageSchema);
