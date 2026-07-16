const cloudinary = require('cloudinary').v2;
const streamifier = require('streamifier');

class StorageService {
  constructor() {
    this.provider = 'cloudinary';
    
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      console.warn('⚠️ Cloudinary credentials missing in .env!');
    }

    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET
    });
  }

  async uploadFile(fileBuffer, originalName, mimeType) {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_chunked_stream(
        {
          resource_type: 'raw',
          folder: 'ledgzo_e2ee',
          chunk_size: 6000000 // 6MB chunk size to respect Cloudinary's default 10MB per-request limit
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
  }

  async deleteFile(fileUrl) {
    // Cloudinary deletion can be complex for raw files, need public_id
    console.log('Cloudinary delete requested for:', fileUrl);
  }
}

module.exports = new StorageService();
