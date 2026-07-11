const Notification = require('../models/Notification');

class NotificationService {
  async createNotification(data) {
    const notification = await Notification.create(data);
    return notification;
  }

  async getMyNotifications(userId, limit = 20) {
    return await Notification.find({ recipient: userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('sender', 'firstName lastName avatar');
  }

  async markAsRead(notificationId, userId) {
    return await Notification.findOneAndUpdate(
      { _id: notificationId, recipient: userId },
      { isRead: true },
      { new: true }
    );
  }

  async markAllAsRead(userId) {
    return await Notification.updateMany(
      { recipient: userId, isRead: false },
      { isRead: true }
    );
  }
}

module.exports = new NotificationService();
