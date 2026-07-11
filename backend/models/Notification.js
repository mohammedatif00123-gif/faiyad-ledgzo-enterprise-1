const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  type: {
    type: String,
    enum: ['mention', 'message', 'call', 'system', 'task'],
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  body: String,
  actionUrl: String,
  isRead: {
    type: Boolean,
    default: false,
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Notification', notificationSchema);
