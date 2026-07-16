const mongoose = require('mongoose');

const groupKeySchema = new mongoose.Schema({
  conversation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true,
    index: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  encryptedKey: {
    type: Object, // { iv, ciphertext }
    required: true
  },
  encryptedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  version: {
    type: Number,
    default: 1
  }
}, { timestamps: true });

groupKeySchema.index({ conversation: 1, user: 1, version: 1 }, { unique: true });

const GroupKey = mongoose.model('GroupKey', groupKeySchema);

module.exports = GroupKey;
