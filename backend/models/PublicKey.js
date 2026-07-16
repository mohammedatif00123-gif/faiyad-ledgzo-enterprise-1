const mongoose = require('mongoose');

const publicKeySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true // One master key pair per user
  },
  deviceId: {
    type: String,
    required: false
  },
  publicKey: {
    type: Object, // Stores JWK or string format of ECDH P-256 public key
    required: true
  },
  privateKey: {
    type: Object, // Stores JWK of ECDH P-256 private key for cross-browser sync
    required: false
  },
  isDeprecated: {
    type: Boolean,
    default: false // Set to true for legacy duplicate keys
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

// Middleware to update the updatedAt timestamp
publicKeySchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const PublicKey = mongoose.model('PublicKey', publicKeySchema);

module.exports = PublicKey;

