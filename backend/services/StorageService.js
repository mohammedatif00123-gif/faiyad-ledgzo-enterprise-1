const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class StorageService {
  constructor() {
    this.provider = process.env.STORAGE_PROVIDER || 'local';
    this.uploadDir = path.join(__dirname, '../../uploads');
    
    if (this.provider === 'local') {
      if (!fs.existsSync(this.uploadDir)) {
        fs.mkdirSync(this.uploadDir, { recursive: true });
      }
    }
  }

  async uploadFile(fileBuffer, originalName, mimeType) {
    if (this.provider === 'local') {
      const ext = path.extname(originalName);
      const filename = `${crypto.randomBytes(16).toString('hex')}${ext}`;
      const filePath = path.join(this.uploadDir, filename);
      
      fs.writeFileSync(filePath, fileBuffer);
      return `/uploads/${filename}`;
    } else if (this.provider === 's3') {
      // Future S3 implementation
      throw new Error('S3 provider not implemented');
    }
  }

  async deleteFile(fileUrl) {
    if (this.provider === 'local') {
      const filename = path.basename(fileUrl);
      const filePath = path.join(this.uploadDir, filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
  }
}

module.exports = new StorageService();
