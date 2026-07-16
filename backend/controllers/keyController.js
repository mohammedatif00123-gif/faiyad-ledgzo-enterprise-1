const PublicKey = require('../models/PublicKey');
const { sendResponse } = require('../utils/apiResponse');

exports.uploadPublicKey = async (req, res, next) => {
  try {
    const { deviceId, publicKey, privateKey } = req.body;
    
    if (!publicKey) {
      return res.status(400).json({ success: false, message: 'publicKey is required' });
    }

    // Upsert the master key for this user
    const updatePayload = { publicKey, updatedAt: Date.now(), isDeprecated: false };
    if (deviceId) updatePayload.deviceId = deviceId;
    if (privateKey) updatePayload.privateKey = privateKey;

    const key = await PublicKey.findOneAndUpdate(
      { user: req.user.id, deviceId: deviceId || 'unknown' },
      updatePayload,
      { upsert: true, returnDocument: 'after' }
    );

    // If there was an upsert on a previously legacy DB, make sure we mark legacy keys as deprecated
    // This ensures only the master key is active for future encryptions
    await PublicKey.updateMany(
      { user: req.user.id, _id: { $ne: key._id } },
      { $set: { isDeprecated: true } }
    );

    sendResponse(res, 200, 'Keys uploaded successfully', key);
  } catch (error) {
    next(error);
  }
};

exports.getPublicKeys = async (req, res, next) => {
  try {
    const { userId } = req.params;
    
    // Get all public keys for the user, sorted by most recently updated
    const keys = await PublicKey.find({ user: userId }).sort({ updatedAt: -1 }).select('-__v').lean();
    
    // NEVER expose the private key to other users. 
    // Add a boolean flag so the frontend can identify the canonical master key safely.
    const safeKeys = keys.map(k => {
      const { privateKey, ...safeKey } = k;
      return { ...safeKey, hasPrivateKey: !!privateKey };
    });
    
    sendResponse(res, 200, 'Public keys fetched successfully', safeKeys);
  } catch (error) {
    next(error);
  }
};

exports.getMyPublicKeys = async (req, res, next) => {
  try {
    const keys = await PublicKey.find({ user: req.user.id }).sort({ updatedAt: -1 }).select('-__v');
    sendResponse(res, 200, 'Public keys fetched successfully', keys);
  } catch (error) {
    next(error);
  }
};

exports.getGroupKey = async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const GroupKey = require('../models/GroupKey');
    const Conversation = require('../models/Conversation');

    const keyDocs = await GroupKey.find({ conversation: conversationId, user: req.user.id });
    if (!keyDocs || keyDocs.length === 0) {
      return res.status(404).json({ success: false, message: 'Group key not found for this user' });
    }

    const conversation = await Conversation.findById(conversationId);

    const keys = keyDocs.map(doc => ({
      version: doc.version || 1,
      encryptedKey: doc.encryptedKey,
      creatorId: doc.encryptedBy || conversation.createdBy
    }));

    sendResponse(res, 200, 'Group keys fetched successfully', keys);
  } catch (error) {
    next(error);
  }
};
