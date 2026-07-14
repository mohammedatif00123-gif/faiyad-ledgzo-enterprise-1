const PublicKey = require('../models/PublicKey');
const { sendResponse } = require('../utils/apiResponse');

exports.uploadPublicKey = async (req, res, next) => {
  try {
    const { deviceId, publicKey } = req.body;
    
    if (!deviceId || !publicKey) {
      return res.status(400).json({ success: false, message: 'deviceId and publicKey are required' });
    }

    // Upsert the public key for this user + device
    const key = await PublicKey.findOneAndUpdate(
      { user: req.user.id, deviceId },
      { publicKey, updatedAt: Date.now() },
      { upsert: true, returnDocument: 'after' }
    );

    sendResponse(res, 200, 'Public key uploaded successfully', key);
  } catch (error) {
    next(error);
  }
};

exports.getPublicKeys = async (req, res, next) => {
  try {
    const { userId } = req.params;
    
    // Get all public keys for the user (they might have multiple devices)
    const keys = await PublicKey.find({ user: userId }).select('-__v');
    
    sendResponse(res, 200, 'Public keys fetched successfully', keys);
  } catch (error) {
    next(error);
  }
};

exports.getMyPublicKeys = async (req, res, next) => {
  try {
    const keys = await PublicKey.find({ user: req.user.id }).select('-__v');
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

    const keyDoc = await GroupKey.findOne({ conversation: conversationId, user: req.user.id });
    if (!keyDoc) {
      return res.status(404).json({ success: false, message: 'Group key not found for this user' });
    }

    const conversation = await Conversation.findById(conversationId);

    sendResponse(res, 200, 'Group key fetched successfully', {
      encryptedKey: keyDoc.encryptedKey,
      creatorId: conversation.createdBy
    });
  } catch (error) {
    next(error);
  }
};
