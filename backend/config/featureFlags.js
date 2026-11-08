const isAppointmentBookingEnabled = () => process.env.APPOINTMENTS_ENABLED === 'true';

const DEFAULT_BOOKABLE_APPOINTMENT_ROLES = ['faculty', 'hod'];
const ALLOWED_APPOINTMENT_ROLES = new Set(['faculty', 'hod', 'principal']);

const getBookableAppointmentRoles = () => {
  const configuredRoles = process.env.APPOINTMENT_BOOKABLE_ROLES === undefined
    ? DEFAULT_BOOKABLE_APPOINTMENT_ROLES
    : process.env.APPOINTMENT_BOOKABLE_ROLES.split(',');
  const roles = [...new Set(configuredRoles
    .map((role) => role.trim().toLowerCase())
    .filter((role) => ALLOWED_APPOINTMENT_ROLES.has(role)))];
  return roles.length ? roles : [...DEFAULT_BOOKABLE_APPOINTMENT_ROLES];
};

module.exports = { getBookableAppointmentRoles, isAppointmentBookingEnabled };
