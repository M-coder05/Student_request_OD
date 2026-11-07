const { isAppointmentBookingEnabled } = require('../config/featureFlags');

const requireAppointmentsEnabledForRealStudents = (req, res, next) => {
  if (
    req.user?.role === 'student' &&
    req.user.isDemo !== true &&
    !isAppointmentBookingEnabled()
  ) {
    return res.status(403).json({ message: 'Appointment booking is not enabled' });
  }

  return next();
};

module.exports = requireAppointmentsEnabledForRealStudents;
