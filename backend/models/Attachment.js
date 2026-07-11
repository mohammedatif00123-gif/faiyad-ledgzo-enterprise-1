const mongoose = require('mongoose');

const attachmentSchema = new mongoose.Schema({
  message: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
    required: false, // Could be null if pre-uploaded before message send
  },
  uploader: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  fileUrl: {
    type: String,
    required: true,
  },
  fileType: {
    type: String,
    enum: ['image', 'document', 'voice_note', 'video'],
    required: true,
  },
  fileName: String,
  fileSize: Number, // in bytes
  metadata: {
    type: mongoose.Schema.Types.Mixed, // E.g., duration for voice_notes
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Attachment', attachmentSchema);
