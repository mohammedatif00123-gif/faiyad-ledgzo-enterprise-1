const mongoose = require('mongoose');

const messageHistorySchema = new mongoose.Schema({
  message: { type: mongoose.Schema.Types.ObjectId, ref: 'Message', required: true },
  previousContent: { type: String, required: true },
  editedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  reason: { type: String },
  editedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

module.exports = mongoose.model('MessageHistory', messageHistorySchema);
