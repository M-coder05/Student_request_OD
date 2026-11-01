const mongoose = require('mongoose');
const Notification = require('../models/Notification');
const { isDemoUser } = require('../config/demo');

const parsePositiveInteger = (value, fallback) => {
  if (value === undefined) {
    return fallback;
  }

  if (!/^[1-9]\d*$/.test(String(value))) {
    return null;
  }

  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
};

const getNotifications = async (req, res) => {
  const page = parsePositiveInteger(req.query.page, 1);
  const limit = parsePositiveInteger(req.query.limit, 20);

  if (page === null || limit === null || limit > 50) {
    return res.status(400).json({ message: 'Page must be positive and limit must be between 1 and 50' });
  }

  if (isDemoUser(req.user)) {
    return res.status(200).json({
      notifications: [],
      unreadCount: 0,
      total: 0,
      page,
      pages: 0,
    });
  }

  const filter = { userId: req.user._id };
  const [notifications, total, unreadCount] = await Promise.all([
    Notification.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).select('-userId'),
    Notification.countDocuments(filter),
    Notification.countDocuments({ ...filter, read: false }),
  ]);

  res.status(200).json({
    notifications,
    total,
    unreadCount,
    page,
    pages: Math.ceil(total / limit),
  });
};

const markNotificationRead = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: 'A valid notification ID is required' });
  }

  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, userId: req.user._id },
    { $set: { read: true } },
    { new: true }
  ).select('-userId');

  if (!notification) {
    return res.status(404).json({ message: 'Notification not found' });
  }

  res.status(200).json({ notification });
};

const markAllNotificationsRead = async (req, res) => {
  const result = await Notification.updateMany(
    { userId: req.user._id, read: false },
    { $set: { read: true } }
  );

  res.status(200).json({ message: 'Notifications marked as read', updatedCount: result.modifiedCount });
};

module.exports = { getNotifications, markNotificationRead, markAllNotificationsRead };
