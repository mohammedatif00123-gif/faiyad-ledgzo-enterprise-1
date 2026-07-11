const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
  name: {
    type: String,
    trim: true,
  },
  type: {
    type: String,
    enum: ['direct', 'channel', 'meeting'],
    required: true,
  },
  isArchived: {
    type: Boolean,
    default: false,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  avatar: {
    type: String,
    default: null
  },
  description: {
    type: String,
    trim: true,
    default: ''
  },
  visibility: {
    type: String,
    enum: ['public', 'private', 'invite_only'],
    default: 'private'
  },
  permissionsMatrix: {
    anyoneCanSend: { type: Boolean, default: true },
    adminsOnlySend: { type: Boolean, default: false },
    anyoneCanEditInfo: { type: Boolean, default: false },
    adminsOnlyEditInfo: { type: Boolean, default: true },
    anyoneCanAddMembers: { type: Boolean, default: false },
    adminsOnlyAddMembers: { type: Boolean, default: true },
    allowInviteLinks: { type: Boolean, default: true },
    allowForwarding: { type: Boolean, default: true },
    allowFileUploads: { type: Boolean, default: true },
    allowVoiceNotes: { type: Boolean, default: true }
  },
  settings: {
    historyVisibleToNew: { type: Boolean, default: true },
    autoDelete: { type: Boolean, default: false },
  },
  memberCount: {
    type: Number,
    default: 0
  },
  inviteLink: {
    type: String,
    sparse: true,
    unique: true
  },
  isSoftDeleted: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Conversation', conversationSchema);
