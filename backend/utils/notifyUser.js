const Notification = require('../models/Notification');
const sendMail = require('./mailer');
const { buildRequestEmail } = require('./emailTemplates');

const notifyUser = async ({ user, request, type, title, message, oldStatus, newStatus }) => {
  let notification;

  try {
    notification = await Notification.create({
      userId: user._id,
      title,
      message,
      requestId: request.requestId,
      type,
    });
  } catch (error) {
    console.error('[notifications] Failed to save notification:', error.message);
    return;
  }

  try {
    const email = buildRequestEmail({
      requestId: request.requestId,
      type,
      oldStatus,
      newStatus,
      adminRemark: request.adminRemark,
    });
    await sendMail({
      to: user.email,
      ...email,
      isDemo: user.isDemo === true,
    });
  } catch (error) {
    console.error('[notifications] Email delivery failed:', error.message);
  }

  return notification;
};

module.exports = notifyUser;
