const express = require('express');
const router = express.Router();
const multer = require('multer');
const { protect } = require('../middlewares/authMiddleware');
const StorageService = require('../services/StorageService');
const Attachment = require('../models/Attachment');

const FILE_TYPES = {
  image: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'],
  code: ['js', 'jsx', 'ts', 'tsx', 'py', 'java', 'html', 'css', 'json', 'xml', 'yaml', 'yml', 'md', 'txt', 'sh', 'bash', 'c', 'cpp', 'h', 'go', 'rb', 'php', 'swift', 'kt', 'rs', 'scala', 'sql', 'vue', 'svelte'],
  document: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'odt', 'ods', 'odp'],
  video: ['mp4', 'webm', 'mov', 'avi', 'mkv', 'flv', 'wmv'],
  audio: ['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a']
};

function getFileTypeFromExtension(filename) {
  const ext = filename.split('.').pop().toLowerCase();
  if (FILE_TYPES.image.includes(ext)) return 'image';
  if (FILE_TYPES.code.includes(ext)) return 'code';
  if (FILE_TYPES.document.includes(ext)) return 'document';
  if (FILE_TYPES.video.includes(ext)) return 'video';
  if (FILE_TYPES.audio.includes(ext)) return 'voice_note';
  return 'generic';
}

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 200 * 1024 * 1024 } // 200MB limit
});

router.use(protect);

router.post('/', upload.array('files', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, error: 'No files provided' });
    }

    let metadataArray = [];
    if (req.body.metadata) {
      try {
        const parsed = JSON.parse(req.body.metadata);
        if (Array.isArray(parsed)) {
          metadataArray = parsed;
        } else {
          metadataArray = [parsed];
        }
      } catch (e) {
        console.error('Error parsing metadata', e);
      }
    }

    const attachments = [];
    for (let i = 0; i < req.files.length; i++) {
      const file = req.files[i];
      // Use extension based detection since encrypted files mask mimetype
      let fileType = getFileTypeFromExtension(file.originalname);

      const fileUrl = await StorageService.uploadFile(file.buffer, file.originalname, file.mimetype);
      
      const attachment = await Attachment.create({
        uploader: req.user._id,
        fileUrl,
        fileType,
        fileName: file.originalname,        // original name (e.g. "Vacation Goa.jpg")
        originalName: file.originalname,    // explicit alias for clarity
        mimeType: file.mimetype,            // original MIME type
        fileSize: file.size,
        metadata: metadataArray[i] || null
      });
      
      attachments.push(attachment);
    }

    res.status(201).json({ success: true, data: attachments });
  } catch (error) {
    console.error('Upload Error:', error);
    res.status(500).json({ success: false, error: 'File upload failed', details: error.message, stack: error.stack });
  }
});

module.exports = router;
