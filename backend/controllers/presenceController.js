const PresenceService = require('../services/PresenceService');
const { sendResponse } = require('../utils/apiResponse');

exports.getMyPresence = async (req, res, next) => {
  try {
    const presence = await PresenceService.getMyPresence(req.user.id);
    sendResponse(res, 200, 'Current presence fetched successfully', presence);
  } catch (error) {
    next(error);
  }
};

exports.getWorkforcePresence = async (req, res, next) => {
  try {
    const presenceList = await PresenceService.getWorkforcePresence();
    sendResponse(res, 200, 'Workforce presence fetched successfully', presenceList);
  } catch (error) {
    next(error);
  }
};

exports.getDashboardMetrics = async (req, res, next) => {
  try {
    const metrics = await PresenceService.getDashboardMetrics();
    sendResponse(res, 200, 'Presence metrics fetched successfully', metrics);
  } catch (error) {
    next(error);
  }
};
