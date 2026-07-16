const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const cloudinary = require('cloudinary').v2;
const streamifier = require('streamifier');

class StorageService {
  constructor() {
    this.provider = process.env.STORAGE_PROVIDER || 'local';
    this.uploadDir = path.join(__dirname, '../../uploads');
    
    if (this.provider === 'local') {
      if (!fs.existsSync(this.uploadDir)) {
        fs.mkdirSync(this.uploadDir, { recursive: true });
      }
    } else if (this.provider === 'cloudinary') {
      cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET
      });
    }
  }

  async uploadFile(fileBuffer, originalName, mimeType) {
    if (this.provider === 'local') {
      const ext = path.extname(originalName);
      const filename = `${crypto.randomBytes(16).toString('hex')}${ext}`;
      const filePath = path.join(this.uploadDir, filename);
      
      fs.writeFileSync(filePath, fileBuffer);
      return `/uploads/${filename}`;
    } else if (this.provider === 'cloudinary') {
      return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            resource_type: 'raw',  // E2EE files are encrypted binary — must use raw
            folder: 'ledgzo_e2ee',
          },
          (error, result) => {
            if (error) {
              console.error('Cloudinary Upload Error:', error);
              return reject(error);
            }
            resolve(result.secure_url);
          }
        );
        streamifier.createReadStream(fileBuffer).pipe(uploadStream);
      });
    } else if (this.provider === 's3') {
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
    } else if (this.provider === 'cloudinary') {
      // Cloudinary deletion can be complex for raw files, need public_id
      console.log('Cloudinary delete requested for:', fileUrl);
      // Optional: implement if needed
    }
  }
}

module.exports = new StorageService();
