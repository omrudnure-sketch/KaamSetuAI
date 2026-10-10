import { Notification } from '../models/index.js';
import { getIO } from '../socket/socketManager.js';

export const createNotification = async ({
  userId,
  type,
  title,
  message,
  data = {},
  relatedEntityType = '',
  relatedEntityId = null,
}) => {
  const notification = new Notification({
    userId,
    type,
    title,
    message,
    data,
    relatedEntityType,
    relatedEntityId,
    channel: 'in_app',
  });

  await notification.save();

  // Real-time socket emit if socket IO initialized
  try {
    const io = getIO();
    if (io) {
      io.to(`user:${userId.toString()}`).emit('notification:new', notification);
    }
  } catch (_err) {
    // Socket not initialized or off
  }

  return notification;
};

export const getUserNotifications = async (userId, limit = 50) => {
  return await Notification.find({ userId })
    .sort({ createdAt: -1 })
    .limit(limit);
};

export const getUnreadCount = async (userId) => {
  return await Notification.countDocuments({ userId, isRead: false });
};

export const markAsRead = async (userId, notificationId) => {
  const notification = await Notification.findOne({ _id: notificationId, userId });
  if (!notification) {
    const error = new Error('Notification not found');
    error.statusCode = 404;
    throw error;
  }

  notification.isRead = true;
  notification.readAt = new Date();
  await notification.save();
  return notification;
};

export const markAllAsRead = async (userId) => {
  await Notification.updateMany(
    { userId, isRead: false },
    { $set: { isRead: true, readAt: new Date() } }
  );
  return { success: true };
};
