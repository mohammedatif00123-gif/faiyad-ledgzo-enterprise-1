const mongoose = require('mongoose');

const draftMessageSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  conversation: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true },
  content: { type: String, required: true },
  parentMessage: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' }
}, {
  timestamps: true
});

// One draft per conversation/thread per user
draftMessageSchema.index({ user: 1, conversation: 1, parentMessage: 1 }, { unique: true });

module.exports = mongoose.model('DraftMessage', draftMessageSchema);
