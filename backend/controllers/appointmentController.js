const crypto = require('crypto');
const mongoose = require('mongoose');
const Appointment = require('../models/Appointment');
const Availability = require('../models/Availability');
const BlackoutDate = require('../models/BlackoutDate');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const notifyUser = require('../utils/notifyUser');
const { getBookableAppointmentRoles } = require('../config/featureFlags');
const {
  addDays,
  isValidDate,
  kolkataDateTimeEpoch,
  minutesToTime,
  timeToMinutes,
  weekdayForDate,
  weekRangeForDate,
} = require('../utils/appointmentTime');

const STAFF_ROLES = ['faculty', 'hod', 'principal'];
const ACTIVE_STATUSES = ['Pending', 'Approved', 'Rescheduled'];
const ADMIN_ROLES = ['admin', 'super_admin', 'demo_admin'];
const asPositiveNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};
const isDemoAdmin = (user) => user.role === 'demo_admin' && user.isDemo === true;
const isAdmin = (user) => (
  (['admin', 'super_admin'].includes(user.role) && user.isDemo !== true) ||
  isDemoAdmin(user)
);
const isStaff = (user) => STAFF_ROLES.includes(user.role);
const isDuplicateKey = (error) => error?.code === 11000;
const getNoticeHours = () => asPositiveNumber(process.env.APPT_MIN_NOTICE_HOURS, 2);
const getCancelHours = () => asPositiveNumber(process.env.APPT_CANCEL_BEFORE_HOURS, 2);
const getMaximumActive = () => Math.floor(asPositiveNumber(process.env.APPT_MAX_ACTIVE, 2));
const getPendingExpiryHours = () => asPositiveNumber(process.env.APPT_PENDING_EXPIRE_HOURS, 72);
const getPrincipalPurposeLength = () => Math.floor(asPositiveNumber(process.env.APPT_PRINCIPAL_PURPOSE_MIN_LENGTH, 30));

const createAppointmentId = () => `APT-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

const recordAudit = (actor, appointment, action, details) => AuditLog.create({
  administratorId: actor._id,
  administratorName: actor.name,
  administratorRole: actor.role,
  action,
  recordType: 'Appointment',
  recordId: appointment._id,
  details,
  isDemo: actor.isDemo === true,
});

const notifyAppointmentUser = (user, appointment, oldStatus, newStatus, title, message) => notifyUser({
  user,
  request: { requestId: appointment.appointmentId, adminRemark: appointment.staffRemark },
  type: 'Appointment',
  title,
  message,
  oldStatus,
  newStatus,
});

const notifyAppointmentParties = async (appointment, oldStatus, newStatus) => {
  const [student, staff] = await Promise.all([
    User.findById(appointment.studentId).select('email isDemo'),
    User.findById(appointment.staffId).select('email isDemo'),
  ]);
  const remark = appointment.staffRemark ? ` Remark: ${appointment.staffRemark}` : '';
  const message = `Appointment ${appointment.appointmentId} changed from ${oldStatus} to ${newStatus}.${remark}`;
  if (student) {
    await notifyAppointmentUser(student, appointment, oldStatus, newStatus, 'Appointment updated', message);
  }
  if (staff && String(staff._id) !== String(student?._id)) {
    await notifyAppointmentUser(staff, appointment, oldStatus, newStatus, 'Appointment updated', message);
  }
};

const expirePendingAppointments = async (filter = {}) => {
  const cutoff = new Date(Date.now() - getPendingExpiryHours() * 60 * 60 * 1000);
  const expired = await Appointment.find({
    ...filter,
    status: 'Pending',
    createdAt: { $lte: cutoff },
  });

  for (const appointment of expired) {
    appointment.status = 'Cancelled';
    appointment.staffRemark = 'Automatically expired because the pending request exceeded its response window.';
    appointment.statusHistory.push({
      fromStatus: 'Pending',
      toStatus: 'Cancelled',
      actorId: appointment.staffId,
      actorName: appointment.staffName,
      actorRole: appointment.staffRole,
      remark: appointment.staffRemark,
    });
    await appointment.save();
    await notifyAppointmentParties(appointment, 'Pending', 'Cancelled');
    await recordAudit({
      _id: appointment.staffId,
      name: appointment.staffName,
      role: appointment.staffRole,
      isDemo: appointment.isDemo,
    }, appointment, 'appointment_auto_expired', appointment.staffRemark);
  }
};

const getBookableStaff = async (req, res) => {
  if (req.user.role !== 'student') return res.status(403).json({ message: 'Student access required' });
  const { role, department } = req.query;
  const bookableRoles = getBookableAppointmentRoles();
  if (role !== undefined && (typeof role !== 'string' || (role && !bookableRoles.includes(role)))) {
    return res.status(400).json({ message: 'That role is not available for booking' });
  }
  const filter = {
    role: role || { $in: bookableRoles },
    isActive: { $ne: false },
    isDemo: req.user.isDemo === true,
  };
  if (typeof department === 'string' && department.trim()) {
    filter.$or = [
      { staffDepartment: department.trim() },
      { staffDepartment: { $in: ['', null] }, department: department.trim() },
      { role: 'principal' },
    ];
  }
  const staff = await User.find(filter)
    .select('name department staffDepartment role')
    .sort({ role: 1, name: 1 });
  const activeStaffIds = staff.length
    ? await Availability.distinct('staffId', {
      staffId: { $in: staff.map((member) => member._id) },
      active: true,
    })
    : [];
  const activeStaff = new Set(activeStaffIds.map(String));
  return res.status(200).json({
    roles: bookableRoles,
    staff: staff
      .filter((member) => activeStaff.has(String(member._id)))
      .map((member) => {
        const staffMember = typeof member.toObject === 'function' ? member.toObject() : member;
        return {
          ...staffMember,
          department: member.staffDepartment || member.department || '',
        };
      }),
  });
};

const getAvailableSlots = async (req, res) => {
  if (req.user.role !== 'student') return res.status(403).json({ message: 'Student access required' });
  const { id } = req.params;
  const { date } = req.query;
  const bookableRoles = getBookableAppointmentRoles();
  if (!mongoose.isValidObjectId(id) || !isValidDate(date)) {
    return res.status(400).json({ message: 'A valid staff ID and date (YYYY-MM-DD) are required' });
  }

  const staff = await User.findOne({
    _id: id,
    isActive: { $ne: false },
    isDemo: req.user.isDemo === true,
  }).select('name department staffDepartment role');
  if (!staff || !STAFF_ROLES.includes(staff.role)) {
    return res.status(404).json({ message: 'Bookable staff member not found' });
  }
  if (!bookableRoles.includes(staff.role)) {
    return res.status(400).json({ message: 'That role is not available for booking' });
  }
  staff.department = staff.staffDepartment || staff.department || '';

  await expirePendingAppointments({ staffId: staff._id, isDemo: staff.isDemo === true });
  const weekday = weekdayForDate(date);
  const availability = await Availability.findOne({ staffId: staff._id, weekday, active: true });
  if (!availability) return res.status(200).json({ staff, date, slots: [] });
  const blackout = await BlackoutDate.exists({ staffId: staff._id, date });
  if (blackout) return res.status(200).json({ staff, date, slots: [] });

  const bookings = await Appointment.find({
    staffId: staff._id,
    date,
    status: { $in: ACTIVE_STATUSES },
  }).select('startTime');
  const bookedTimes = new Set(bookings.map((appointment) => appointment.startTime));
  const from = timeToMinutes(availability.startTime);
  const until = timeToMinutes(availability.endTime);
  const now = Date.now() + getNoticeHours() * 60 * 60 * 1000;
  const slots = [];

  for (let start = from; start + availability.slotMinutes <= until; start += availability.slotMinutes) {
    const startTime = minutesToTime(start);
    if (bookedTimes.has(startTime)) continue;
    const slotEpoch = kolkataDateTimeEpoch(date, startTime);
    if (slotEpoch === null || slotEpoch < now) continue;
    slots.push({ startTime, endTime: minutesToTime(start + availability.slotMinutes) });
  }

  return res.status(200).json({ staff, date, slots });
};

const validateFreeSlot = async (staffId, date, startTime, excludeId) => {
  if (!isValidDate(date)) return { error: 'Please provide a valid date (YYYY-MM-DD)' };
  const weekday = weekdayForDate(date);
  const availability = await Availability.findOne({ staffId, weekday, active: true });
  if (!availability) return { error: 'Staff is not available on the selected date' };
  const blackout = await BlackoutDate.exists({ staffId, date });
  if (blackout) return { error: 'Staff is unavailable on the selected date' };

  const start = timeToMinutes(startTime);
  const from = timeToMinutes(availability.startTime);
  const until = timeToMinutes(availability.endTime);
  if (
    start === null ||
    start < from ||
    start + availability.slotMinutes > until ||
    (start - from) % availability.slotMinutes !== 0
  ) {
    return { error: 'Selected time is not an available slot' };
  }
  if (kolkataDateTimeEpoch(date, startTime) < Date.now() + getNoticeHours() * 60 * 60 * 1000) {
    return { error: `Appointments require at least ${getNoticeHours()} hours notice and cannot be in the past` };
  }

  const bookingFilter = { staffId, date, startTime, status: { $in: ACTIVE_STATUSES } };
  if (excludeId) bookingFilter._id = { $ne: excludeId };
  if (await Appointment.exists(bookingFilter)) return { error: 'Slot already taken', conflict: true };
  return { availability, endTime: minutesToTime(start + availability.slotMinutes) };
};

const createAppointment = async (req, res) => {
  if (req.user.role !== 'student') return res.status(403).json({ message: 'Student access required' });
  const { staffId, date, startTime, purpose } = req.body || {};
  const cleanPurpose = typeof purpose === 'string' ? purpose.trim() : '';
  if (!mongoose.isValidObjectId(staffId) || !isValidDate(date) || !cleanPurpose) {
    return res.status(400).json({ message: 'Staff, a valid date, time and purpose are required' });
  }
  if (cleanPurpose.length < 10 || cleanPurpose.length > 300) {
    return res.status(400).json({ message: 'Purpose must be between 10 and 300 characters' });
  }

  const bookableRoles = getBookableAppointmentRoles();
  const staff = await User.findOne({
    _id: staffId,
    isActive: { $ne: false },
    isDemo: req.user.isDemo === true,
  });
  if (!staff || !STAFF_ROLES.includes(staff.role)) {
    return res.status(404).json({ message: 'Bookable staff member not found' });
  }
  if (!bookableRoles.includes(staff.role)) {
    return res.status(400).json({ message: 'That role is not available for booking' });
  }
  const staffDepartment = staff.staffDepartment || staff.department || '';
  if (staff.role !== 'principal' && staffDepartment !== req.user.department) {
    return res.status(403).json({ message: 'You can only book staff in your department' });
  }
  if (staff.role === 'principal' && cleanPurpose.length < getPrincipalPurposeLength()) {
    return res.status(400).json({ message: `Principal appointments require a purpose of at least ${getPrincipalPurposeLength()} characters` });
  }

  const slot = await validateFreeSlot(staff._id, date, startTime);
  if (slot.error) return res.status(slot.conflict ? 409 : 400).json({ message: slot.error });

  const { start: weekStart, end: weekEnd } = weekRangeForDate(date);
  const activeCount = await Appointment.countDocuments({
    studentId: req.user._id,
    date: { $gte: weekStart, $lte: weekEnd },
    status: { $in: ACTIVE_STATUSES },
  });
  if (activeCount >= getMaximumActive()) {
    return res.status(409).json({ message: `You can have at most ${getMaximumActive()} active appointments per week` });
  }

  const appointment = new Appointment({
    appointmentId: createAppointmentId(),
    studentId: req.user._id,
    studentName: req.user.name,
    registerNumber: req.user.registerNumber,
    department: req.user.department,
    staffId: staff._id,
    staffName: staff.name,
    staffRole: staff.role,
    date,
    startTime,
    endTime: slot.endTime,
    purpose: cleanPurpose,
    status: 'Pending',
    isDemo: req.user.isDemo === true,
    statusHistory: [{
      fromStatus: '',
      toStatus: 'Pending',
      actorId: req.user._id,
      actorName: req.user.name,
      actorRole: req.user.role,
      remark: '',
    }],
  });

  try {
    await appointment.save();
  } catch (error) {
    if (isDuplicateKey(error)) return res.status(409).json({ message: 'Slot already taken' });
    throw error;
  }

  const requestMessage = `${req.user.name} requested appointment ${appointment.appointmentId} for ${date} at ${startTime}.`;
  await Promise.all([
    notifyAppointmentUser(req.user, appointment, 'New', 'Pending', 'Appointment request submitted', requestMessage),
    notifyAppointmentUser(staff, appointment, 'New', 'Pending', 'Appointment request received', requestMessage),
  ]);
  await recordAudit(req.user, appointment, 'appointment_requested', `${appointment.appointmentId}: ${date} ${startTime}`);
  return res.status(201).json({ message: 'Appointment requested successfully', appointment });
};

const getMyAppointments = async (req, res) => {
  if (req.user.role !== 'student') return res.status(403).json({ message: 'Student access required' });
  await expirePendingAppointments({ studentId: req.user._id, isDemo: req.user.isDemo === true });
  const appointments = await Appointment.find({
    studentId: req.user._id,
    isDemo: req.user.isDemo === true,
  }).sort({ date: -1, startTime: -1 });
  return res.status(200).json({ appointments });
};

const cancelAppointment = async (req, res) => {
  if (req.user.role !== 'student') return res.status(403).json({ message: 'Student access required' });
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'A valid appointment ID is required' });
  const appointment = await Appointment.findOne({
    _id: req.params.id,
    studentId: req.user._id,
    isDemo: req.user.isDemo === true,
  });
  if (!appointment) return res.status(404).json({ message: 'Appointment not found' });
  if (!ACTIVE_STATUSES.includes(appointment.status)) {
    return res.status(400).json({ message: 'This appointment can no longer be cancelled' });
  }
  const startsAt = kolkataDateTimeEpoch(appointment.date, appointment.startTime);
  if (startsAt - Date.now() < getCancelHours() * 60 * 60 * 1000) {
    return res.status(400).json({ message: `Appointments can only be cancelled at least ${getCancelHours()} hours before they start` });
  }

  const previousStatus = appointment.status;
  appointment.status = 'Cancelled';
  appointment.staffRemark = 'Cancelled by student.';
  appointment.statusHistory.push({
    fromStatus: previousStatus,
    toStatus: 'Cancelled',
    actorId: req.user._id,
    actorName: req.user.name,
    actorRole: req.user.role,
    remark: appointment.staffRemark,
  });
  await appointment.save();
  await notifyAppointmentParties(appointment, previousStatus, 'Cancelled');
  await recordAudit(req.user, appointment, 'appointment_cancelled', appointment.staffRemark);
  return res.status(200).json({ message: 'Appointment cancelled', appointment });
};

const getStaffQueue = async (req, res) => {
  if (!isStaff(req.user) && !isAdmin(req.user)) return res.status(403).json({ message: 'Staff access required' });
  let filter = {};
  if (isAdmin(req.user)) {
    if (isDemoAdmin(req.user)) filter.isDemo = true;
  } else {
    filter = { staffId: req.user._id, isDemo: req.user.isDemo === true };
  }
  const selectedDate = req.query.date;
  if (selectedDate) {
    if (!isValidDate(selectedDate)) return res.status(400).json({ message: 'Date must use YYYY-MM-DD format' });
    filter.date = selectedDate;
  }
  await expirePendingAppointments(filter);
  const appointments = await Appointment.find(filter).sort({ date: 1, startTime: 1 });
  return res.status(200).json({ appointments });
};

const getAppointmentForStaff = async (req, res) => {
  const filter = { _id: req.params.id };
  if (!isAdmin(req.user)) {
    filter.staffId = req.user._id;
    filter.isDemo = req.user.isDemo === true;
  } else if (isDemoAdmin(req.user)) {
    filter.isDemo = true;
  }
  return Appointment.findOne(filter);
};

const recordStatusChange = (appointment, actor, previousStatus, nextStatus, remark) => {
  appointment.status = nextStatus;
  if (typeof remark === 'string') appointment.staffRemark = remark.trim().slice(0, 1000);
  appointment.statusHistory.push({
    fromStatus: previousStatus,
    toStatus: nextStatus,
    actorId: actor._id,
    actorName: actor.name,
    actorRole: actor.role,
    remark: appointment.staffRemark,
  });
};

const decideAppointment = async (req, res) => {
  if (!isStaff(req.user) && !isAdmin(req.user)) return res.status(403).json({ message: 'Staff access required' });
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'A valid appointment ID is required' });
  const { decision, remark, newDate, newStartTime } = req.body || {};
  if (!['approve', 'reject', 'reschedule'].includes(decision)) {
    return res.status(400).json({ message: 'Decision must be approve, reject or reschedule' });
  }
  const appointment = await getAppointmentForStaff(req, res);
  if (!appointment) return res.status(404).json({ message: 'Appointment not found' });
  if (appointment.status !== 'Pending') return res.status(400).json({ message: 'Only pending appointments can be decided' });

  const previousStatus = appointment.status;
  let nextStatus = decision === 'approve' ? 'Approved' : 'Rejected';
  if (decision === 'reschedule') {
    const slot = await validateFreeSlot(appointment.staffId, newDate, newStartTime, appointment._id);
    if (slot.error) return res.status(slot.conflict ? 409 : 400).json({ message: slot.error });
    appointment.date = newDate;
    appointment.startTime = newStartTime;
    appointment.endTime = slot.endTime;
    nextStatus = 'Rescheduled';
  }

  recordStatusChange(appointment, req.user, previousStatus, nextStatus, remark);
  try {
    await appointment.save();
  } catch (error) {
    if (isDuplicateKey(error)) return res.status(409).json({ message: 'Slot already taken' });
    throw error;
  }
  await notifyAppointmentParties(appointment, previousStatus, nextStatus);
  await recordAudit(req.user, appointment, `appointment_${decision}`, `${previousStatus} -> ${nextStatus}${appointment.staffRemark ? `: ${appointment.staffRemark}` : ''}`);
  const resultMessage = {
    approve: 'Appointment approved',
    reject: 'Appointment rejected',
    reschedule: 'Appointment rescheduled',
  }[decision];
  return res.status(200).json({ message: resultMessage, appointment });
};

const updateAppointmentOutcome = async (req, res, status) => {
  if (!isStaff(req.user) && !isAdmin(req.user)) return res.status(403).json({ message: 'Staff access required' });
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'A valid appointment ID is required' });
  const appointment = await getAppointmentForStaff(req, res);
  if (!appointment) return res.status(404).json({ message: 'Appointment not found' });
  if (!['Approved', 'Rescheduled'].includes(appointment.status)) {
    return res.status(400).json({ message: 'Only approved appointments can be completed or marked no-show' });
  }
  const previousStatus = appointment.status;
  recordStatusChange(appointment, req.user, previousStatus, status, req.body?.remark);
  await appointment.save();
  await notifyAppointmentParties(appointment, previousStatus, status);
  await recordAudit(req.user, appointment, `appointment_${status === 'Completed' ? 'completed' : 'no_show'}`, appointment.staffRemark);
  return res.status(200).json({ message: `Appointment marked ${status}`, appointment });
};

const escapeIcsText = (value) => String(value || '').replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
const icsDateTime = (date, time) => `${date.replace(/-/g, '')}T${time.replace(':', '')}00`;

const downloadAppointmentCalendar = async (req, res) => {
  if (req.user.role !== 'student') return res.status(403).json({ message: 'Student access required' });
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'A valid appointment ID is required' });
  const appointment = await Appointment.findOne({
    _id: req.params.id,
    studentId: req.user._id,
    isDemo: req.user.isDemo === true,
  });
  if (!appointment) return res.status(404).json({ message: 'Appointment not found' });
  if (!['Approved', 'Rescheduled'].includes(appointment.status)) {
    return res.status(403).json({ message: 'Calendar files are available for approved appointments only' });
  }
  const calendar = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Smart Student Service Portal//Appointments//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VTIMEZONE',
    'TZID:Asia/Kolkata',
    'BEGIN:STANDARD',
    'DTSTART:19700101T000000',
    'TZOFFSETFROM:+0530',
    'TZOFFSETTO:+0530',
    'TZNAME:IST',
    'END:STANDARD',
    'END:VTIMEZONE',
    'BEGIN:VEVENT',
    `UID:${escapeIcsText(appointment.appointmentId)}@smart-student-service-portal`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')}`,
    `DTSTART;TZID=Asia/Kolkata:${icsDateTime(appointment.date, appointment.startTime)}`,
    `DTEND;TZID=Asia/Kolkata:${icsDateTime(appointment.date, appointment.endTime)}`,
    `SUMMARY:${escapeIcsText(`Appointment with ${appointment.staffName}`)}`,
    `DESCRIPTION:${escapeIcsText(appointment.purpose)}`,
    'END:VEVENT',
    'END:VCALENDAR',
    '',
  ].join('\r\n');
  res.set({
    'Content-Type': 'text/calendar; charset=utf-8',
    'Content-Disposition': `attachment; filename="${appointment.appointmentId}.ics"`,
  });
  return res.status(200).send(calendar);
};

module.exports = {
  cancelAppointment,
  createAppointment,
  decideAppointment,
  downloadAppointmentCalendar,
  getAvailableSlots,
  getBookableStaff,
  getMyAppointments,
  getStaffQueue,
  updateAppointmentOutcome,
};
