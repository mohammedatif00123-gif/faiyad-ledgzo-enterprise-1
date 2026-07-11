const express = require('express');
const router = express.Router();
const multer = require('multer');
const { protect } = require('../middlewares/authMiddleware');
const StorageService = require('../services/StorageService');
const Attachment = require('../models/Attachment');

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 } // 20MB limit
});

router.use(protect);

router.post('/', upload.array('files', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, error: 'No files provided' });
    }

    const attachments = [];
    for (const file of req.files) {
      let fileType = 'document';
      if (file.mimetype.startsWith('image/')) fileType = 'image';
      if (file.mimetype.startsWith('video/')) fileType = 'video';
      if (file.mimetype.startsWith('audio/')) fileType = 'voice_note';

      const fileUrl = await StorageService.uploadFile(file.buffer, file.originalname, file.mimetype);
      
      const attachment = await Attachment.create({
        uploader: req.user.id,
        fileUrl,
        fileType,
        fileName: file.originalname,
        fileSize: file.size,
        metadata: req.body.metadata ? JSON.parse(req.body.metadata) : null
      });
      
      attachments.push(attachment);
    }

    res.status(201).json({ success: true, data: attachments });
  } catch (error) {
    console.error('Upload Error:', error);
    res.status(500).json({ success: false, error: 'File upload failed' });
  }
});

module.exports = router;
