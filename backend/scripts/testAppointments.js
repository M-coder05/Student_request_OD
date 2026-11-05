const assert = require('node:assert/strict');
const Notification = require('../models/Notification');
const Appointment = require('../models/Appointment');
const Availability = require('../models/Availability');
const BlackoutDate = require('../models/BlackoutDate');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const {
  addDays,
  datePartsInKolkata,
  kolkataDateTimeEpoch,
  todayInKolkata,
  weekdayForDate,
  weekRangeForDate,
} = require('../utils/appointmentTime');

process.env.APPT_MIN_NOTICE_HOURS = '2';
process.env.APPT_MAX_ACTIVE = '2';
process.env.APPT_CANCEL_BEFORE_HOURS = '2';
process.env.APPT_PENDING_EXPIRE_HOURS = '72';
process.env.APPT_PRINCIPAL_PURPOSE_MIN_LENGTH = '30';
process.env.RESEND_API_KEY = '';

const users = [
  { _id: '507f1f77bcf86cd799439011', name: 'Student One', registerNumber: 'STU-001', department: 'Engineering', role: 'student', isDemo: false, email: 'student1@example.test' },
  { _id: '507f1f77bcf86cd799439012', name: 'Student Two', registerNumber: 'STU-002', department: 'Engineering', role: 'student', isDemo: false, email: 'student2@example.test' },
  { _id: '507f1f77bcf86cd799439013', name: 'Faculty One', department: 'Engineering', role: 'faculty', isDemo: false, email: 'faculty@example.test' },
  { _id: '507f1f77bcf86cd799439014', name: 'Demo Student', registerNumber: 'DEMO-001', department: 'Engineering', role: 'student', isDemo: true, email: 'demo-student@example.test' },
  { _id: '507f1f77bcf86cd799439015', name: 'Demo Faculty', department: 'Engineering', role: 'faculty', isDemo: true, email: 'demo-faculty@example.test' },
];
const appointments = [];
const blackouts = [];
const availabilities = Array.from({ length: 7 }, (_, weekday) => ({
  staffId: users[2]._id,
  weekday,
  startTime: '00:00',
  endTime: '23:45',
  slotMinutes: 15,
  active: true,
})).concat(Array.from({ length: 7 }, (_, weekday) => ({
  staffId: users[4]._id,
  weekday,
  startTime: '00:00',
  endTime: '23:45',
  slotMinutes: 15,
  active: true,
})));
const notifications = [];
const auditEvents = [];
const emailLogs = [];

const same = (left, right) => String(left) === String(right);
const matches = (document, filter) => Object.entries(filter).every(([key, condition]) => {
  const value = document[key];
  if (condition && typeof condition === 'object' && !(condition instanceof Date) && !condition._bsontype) {
    if ('$in' in condition) return condition.$in.some((item) => same(value, item));
    if ('$ne' in condition) return !same(value, condition.$ne);
    if ('$lte' in condition && !(value <= condition.$lte)) return false;
    if ('$gte' in condition && !(value >= condition.$gte)) return false;
    return true;
  }
  return same(value, condition);
});
const query = (value) => {
  const result = {
    select() { return result; },
    sort() { return result; },
    then(resolve, reject) { return Promise.resolve(value).then(resolve, reject); },
  };
  return result;
};

const originalMethods = {
  notificationCreate: Notification.create,
  auditCreate: AuditLog.create,
  appointmentFind: Appointment.find,
  appointmentFindOne: Appointment.findOne,
  appointmentExists: Appointment.exists,
  appointmentCount: Appointment.countDocuments,
  appointmentSave: Appointment.prototype.save,
  availabilityFindOne: Availability.findOne,
  availabilityDistinct: Availability.distinct,
  blackoutExists: BlackoutDate.exists,
  userFind: User.find,
  userFindOne: User.findOne,
  userFindById: User.findById,
};

Notification.create = async (data) => {
  const notification = { _id: `notification-${notifications.length + 1}`, ...data };
  notifications.push(notification);
  return notification;
};
AuditLog.create = async (data) => {
  auditEvents.push(data);
  return data;
};
Appointment.find = (filter) => query(appointments.filter((item) => matches(item, filter)));
Appointment.findOne = (filter) => query(appointments.find((item) => matches(item, filter)) || null);
Appointment.exists = async (filter) => appointments.some((item) => matches(item, filter));
Appointment.countDocuments = async (filter) => appointments.filter((item) => matches(item, filter)).length;
Appointment.prototype.save = async function save() {
  const duplicate = appointments.some((item) =>
    !same(item._id, this._id) &&
    same(item.staffId, this.staffId) &&
    same(item.date, this.date) &&
    same(item.startTime, this.startTime) &&
    ['Pending', 'Approved', 'Rescheduled'].includes(item.status) &&
    ['Pending', 'Approved', 'Rescheduled'].includes(this.status)
  );
  if (duplicate) {
    const error = new Error('duplicate key');
    error.code = 11000;
    throw error;
  }
  if (!this.createdAt) this.createdAt = new Date();
  const index = appointments.findIndex((item) => same(item._id, this._id));
  if (index >= 0) appointments[index] = this;
  else appointments.push(this);
  return this;
};
Availability.findOne = async (filter) => availabilities.find((item) => matches(item, filter)) || null;
Availability.distinct = async (field, filter) => [...new Set(
  availabilities.filter((item) => matches(item, filter)).map((item) => item[field])
)];
BlackoutDate.exists = async (filter) => blackouts.some((item) => matches(item, filter));
User.find = (filter) => query(users.filter((item) => matches(item, filter)));
User.findOne = (filter) => query(users.find((item) => matches(item, filter)) || null);
User.findById = (id) => query(users.find((item) => same(item._id, id)) || null);

const originalConsoleInfo = console.info;
console.info = (...args) => emailLogs.push(args);

const {
  cancelAppointment,
  createAppointment,
  decideAppointment,
  downloadAppointmentCalendar,
  getAvailableSlots,
  getBookableStaff,
  getMyAppointments,
  getStaffQueue,
} = require('../controllers/appointmentController');

const response = () => ({
  statusCode: 200,
  headers: {},
  status(code) { this.statusCode = code; return this; },
  json(body) { this.body = body; return this; },
  set(headers) { Object.assign(this.headers, headers); return this; },
  send(body) { this.body = body; return this; },
});

const invoke = async (handler, req) => {
  const res = response();
  await handler(req, res);
  return res;
};

const makeBooking = (student, staffId, date, startTime) => ({
  user: student,
  body: { staffId, date, startTime, purpose: 'Discuss study and academic planning' },
});

const main = async () => {
  const activeSlotIndex = Appointment.schema.indexes().find(([keys, options]) =>
    keys.staffId === 1 && keys.date === 1 && keys.startTime === 1 && options.unique
  );
  assert.deepEqual(activeSlotIndex?.[1].partialFilterExpression, { slotReserved: true });
  console.log('PASS: MongoDB schema declares a unique active-slot partial index.');

  const tomorrow = addDays(todayInKolkata(), 1);
  const weekday = weekdayForDate(tomorrow);
  assert.ok(availabilities.some((item) => item.staffId === users[2]._id && item.weekday === weekday));
  assert.equal(weekdayForDate('2026-11-06'), 5);
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
  assert.deepEqual(weekRangeForDate('2026-11-05'), { start: '2026-11-02', end: '2026-11-08' });
  assert.equal(kolkataDateTimeEpoch(tomorrow, '12:00') > Date.now(), true);

  const concurrent = await Promise.all([
    invoke(createAppointment, makeBooking(users[0], users[2]._id, tomorrow, '12:00')),
    invoke(createAppointment, makeBooking(users[1], users[2]._id, tomorrow, '12:00')),
  ]);
  assert.deepEqual(concurrent.map((item) => item.statusCode).sort(), [201, 409]);
  assert.equal(concurrent.find((item) => item.statusCode === 409).body.message, 'Slot already taken');
  console.log('PASS: Two students concurrently request one slot; exactly one receives 201 and the other 409 Slot already taken.');

  const yesterday = addDays(todayInKolkata(), -1);
  const past = await invoke(createAppointment, makeBooking(users[0], users[2]._id, yesterday, '12:00'));
  assert.equal(past.statusCode, 400);
  assert.match(past.body.message, /notice|past/);
  console.log('PASS: A past slot is rejected with HTTP 400.');

  const soon = datePartsInKolkata(new Date(Date.now() + 60 * 60 * 1000));
  const soonDate = `${soon.year}-${soon.month}-${soon.day}`;
  const soonTime = `${soon.hour}:${soon.minute}`;
  const nearAppointment = new Appointment({
    _id: '507f1f77bcf86cd799439099',
    appointmentId: 'APT-TEST-CANCEL',
    studentId: users[0]._id,
    studentName: users[0].name,
    registerNumber: users[0].registerNumber,
    department: users[0].department,
    staffId: users[2]._id,
    staffName: users[2].name,
    staffRole: 'faculty',
    date: soonDate,
    startTime: soonTime,
    endTime: soonTime,
    purpose: 'Cancellation cutoff test',
    status: 'Approved',
    isDemo: false,
    statusHistory: [],
  });
  appointments.push(nearAppointment);
  const cancelTooLate = await invoke(cancelAppointment, { params: { id: nearAppointment._id }, user: users[0] });
  assert.equal(cancelTooLate.statusCode, 400);
  assert.match(cancelTooLate.body.message, /at least 2 hours/);
  appointments.splice(appointments.indexOf(nearAppointment), 1);
  console.log('PASS: Cancellation inside the 2-hour cutoff is rejected with HTTP 400.');

  const winner = appointments.find((item) => item.date === tomorrow && item.startTime === '12:00');
  const rescheduled = await invoke(decideAppointment, {
    params: { id: winner._id },
    user: users[2],
    body: { decision: 'reschedule', remark: 'Moved to a later slot', newDate: tomorrow, newStartTime: '13:00' },
  });
  assert.equal(rescheduled.statusCode, 200);
  assert.equal(rescheduled.body.appointment.status, 'Rescheduled');
  assert.equal(rescheduled.body.appointment.startTime, '13:00');
  console.log('PASS: Staff reschedule updates appointment time and records the Rescheduled status.');

  const second = await invoke(createAppointment, makeBooking(users[0], users[2]._id, tomorrow, '12:15'));
  assert.equal(second.statusCode, 201);
  const approved = await invoke(decideAppointment, {
    params: { id: second.body.appointment._id },
    user: users[2],
    body: { decision: 'approve', remark: 'Approved' },
  });
  assert.equal(approved.statusCode, 200);
  assert.equal(approved.body.appointment.status, 'Approved');
  console.log('PASS: Staff approve changes Pending appointment to Approved.');

  const studentList = await invoke(getMyAppointments, { user: users[0] });
  assert.ok(studentList.body.appointments.every((item) => same(item.studentId, users[0]._id) && !item.isDemo));
  const demoList = await invoke(getMyAppointments, { user: users[3] });
  assert.ok(demoList.body.appointments.every((item) => same(item.studentId, users[3]._id) && item.isDemo));
  const staffQueue = await invoke(getStaffQueue, { user: users[2], query: {} });
  assert.ok(staffQueue.body.appointments.every((item) => same(item.staffId, users[2]._id) && !item.isDemo));
  console.log('PASS: Student, demo-student and staff listing results are scoped to their own records.');

  const calendar = await invoke(downloadAppointmentCalendar, {
    params: { id: approved.body.appointment._id },
    user: users[0],
  });
  assert.equal(calendar.statusCode, 200);
  assert.match(calendar.body, /DTSTART;TZID=Asia\/Kolkata:/);
  assert.match(calendar.body, /DTEND;TZID=Asia\/Kolkata:/);
  console.log('PASS: Approved appointment owner receives a timezone-aware Asia/Kolkata .ics file.');

  const cancelApproved = await invoke(cancelAppointment, {
    params: { id: winner._id },
    user: users.find((item) => same(item._id, winner.studentId)),
  });
  assert.equal(cancelApproved.statusCode, 200);
  assert.equal(cancelApproved.body.appointment.status, 'Cancelled');
  console.log('PASS: Appointment cancellation succeeds outside the configured cutoff.');

  const freeSlots = await invoke(getAvailableSlots, {
    params: { id: users[2]._id },
    query: { date: tomorrow },
    user: users[0],
  });
  assert.equal(freeSlots.statusCode, 200);
  assert.ok(!freeSlots.body.slots.some((slot) => slot.startTime === '12:15'));
  assert.ok(freeSlots.body.slots.some((slot) => slot.startTime === '12:00'));
  console.log('PASS: Availability endpoint omits active bookings and returns unbooked slots.');
  blackouts.push({ staffId: users[2]._id, date: tomorrow });
  const blackoutSlots = await invoke(getAvailableSlots, {
    params: { id: users[2]._id },
    query: { date: tomorrow },
    user: users[0],
  });
  assert.deepEqual(blackoutSlots.body.slots, []);
  blackouts.pop();
  console.log('PASS: Availability endpoint removes all slots for a blackout date.');

  const demoStaffList = await invoke(getBookableStaff, {
    user: users[3],
    query: { role: 'faculty', department: 'Engineering' },
  });
  assert.deepEqual(demoStaffList.body.staff.map((item) => item._id), [users[4]._id]);
  const normalStaffList = await invoke(getBookableStaff, {
    user: users[0],
    query: { role: 'faculty', department: 'Engineering' },
  });
  assert.deepEqual(normalStaffList.body.staff.map((item) => item._id), [users[2]._id]);
  const demoBooking = await invoke(createAppointment, makeBooking(users[3], users[4]._id, tomorrow, '12:00'));
  assert.equal(demoBooking.statusCode, 201);
  assert.equal(demoBooking.body.appointment.isDemo, true);
  assert.ok(notifications.some((item) => same(item.userId, users[3]._id)));
  assert.ok(notifications.some((item) => same(item.userId, users[4]._id)));
  assert.ok(emailLogs.length > 0);
  assert.ok(auditEvents.some((item) => item.action === 'appointment_requested' && item.isDemo));
  assert.match(require('node:fs').readFileSync(require('node:path').join(__dirname, '../../client/src/components/NotificationBell.jsx'), 'utf8'), /notification\.type === 'Appointment' \?/);
  console.log('PASS: Demo students see and book only sandbox staff; demo booking is sandboxed, notified, audited, and email is logged locally.');
  console.log('PASS: Real-student staff listing excludes demo staff.');

  for (const [object, method, original] of [
    [Notification, 'create', originalMethods.notificationCreate],
    [AuditLog, 'create', originalMethods.auditCreate],
    [Appointment, 'find', originalMethods.appointmentFind],
    [Appointment, 'findOne', originalMethods.appointmentFindOne],
    [Appointment, 'exists', originalMethods.appointmentExists],
    [Appointment, 'countDocuments', originalMethods.appointmentCount],
    [Appointment.prototype, 'save', originalMethods.appointmentSave],
    [Availability, 'findOne', originalMethods.availabilityFindOne],
    [Availability, 'distinct', originalMethods.availabilityDistinct],
    [BlackoutDate, 'exists', originalMethods.blackoutExists],
    [User, 'find', originalMethods.userFind],
    [User, 'findOne', originalMethods.userFindOne],
    [User, 'findById', originalMethods.userFindById],
  ]) object[method] = original;
  console.info = originalConsoleInfo;
};

main().catch((error) => {
  console.info = originalConsoleInfo;
  console.error(error);
  process.exitCode = 1;
});
