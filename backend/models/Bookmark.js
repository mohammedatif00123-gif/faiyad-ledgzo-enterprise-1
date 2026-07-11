const mongoose = require('mongoose');

const bookmarkSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  message: { type: mongoose.Schema.Types.ObjectId, ref: 'Message', required: true },
  note: { type: String }
}, {
  timestamps: true
});

bookmarkSchema.index({ user: 1, message: 1 }, { unique: true });

module.exports = mongoose.model('Bookmark', bookmarkSchema);
