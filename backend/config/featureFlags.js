const isAppointmentBookingEnabled = () => process.env.APPOINTMENTS_ENABLED === 'true';

module.exports = { isAppointmentBookingEnabled };
