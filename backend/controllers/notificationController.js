const NotificationService = require('../services/NotificationService');
const { sendResponse } = require('../utils/apiResponse');

exports.getMyNotifications = async (req, res, next) => {
  try {
    const notifications = await NotificationService.getMyNotifications(req.user.id);
    sendResponse(res, 200, 'Notifications fetched successfully', notifications);
  } catch (error) {
    next(error);
  }
};

exports.markAsRead = async (req, res, next) => {
  try {
    const notification = await NotificationService.markAsRead(req.params.id, req.user.id);
    sendResponse(res, 200, 'Notification marked as read', notification);
  } catch (error) {
    next(error);
  }
};

exports.markAllAsRead = async (req, res, next) => {
  try {
    await NotificationService.markAllAsRead(req.user.id);
    sendResponse(res, 200, 'All notifications marked as read', null);
  } catch (error) {
    next(error);
  }
};
