const mongoose = require('mongoose');

const publicKeySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  deviceId: {
    type: String,
    required: true
  },
  publicKey: {
    type: Object, // Stores JWK or string format of ECDH P-256 public key
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// A user can have multiple devices, but each deviceId must be unique per user
publicKeySchema.index({ user: 1, deviceId: 1 }, { unique: true });

// Middleware to update the updatedAt timestamp
publicKeySchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const PublicKey = mongoose.model('PublicKey', publicKeySchema);

module.exports = PublicKey;
