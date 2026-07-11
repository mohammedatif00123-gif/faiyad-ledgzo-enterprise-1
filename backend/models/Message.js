const mongoose = require('mongoose');
require('./Attachment');

const messageSchema = new mongoose.Schema({
  conversation: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, default: '' },
  messageType: { type: String, enum: ['text', 'system', 'call', 'voice'], default: 'text' },
  systemAction: {
    type: String,
    enum: [
      'GROUP_CREATED', 'GROUP_RENAMED', 'GROUP_ICON_CHANGED', 'GROUP_DESCRIPTION_CHANGED',
      'MEMBER_ADDED', 'MEMBER_REMOVED', 'MEMBER_LEFT', 'OWNER_CHANGED', 'ADMIN_PROMOTED',
      'ADMIN_REMOVED', 'SETTINGS_CHANGED', 'INVITE_CREATED', 'INVITE_REGENERATED',
      'INVITE_DISABLED', 'JOIN_REQUEST', 'JOIN_APPROVED', 'JOIN_REJECTED', 'GROUP_DELETED',
      'call_log'
    ]
  },
  parentMessage: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' }, // Direct reply
  threadRoot: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' }, // Thread grouping
  isForwarded: { type: Boolean, default: false },
  forwardSource: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' },
  reactions: [{
    emoji: String,
    users: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
  }],
  attachments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Attachment' }],
  mentions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  isEdited: { type: Boolean, default: false },
  isDeleted: { type: Boolean, default: false }, // Soft delete (deleted for everyone)
  deletedForMe: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // Hidden for specific users
  status: { type: String, enum: ['sent', 'delivered', 'read'], default: 'sent' },
  scheduledFor: { type: Date }
}, {
  timestamps: true
});

module.exports = mongoose.model('Message', messageSchema);
