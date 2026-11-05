require('dotenv').config();
require('express-async-errors');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const express = require('express');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/User');
const Appointment = require('../models/Appointment');
const Availability = require('../models/Availability');
const { addDays, todayInKolkata, weekdayForDate } = require('../utils/appointmentTime');
const { ensureAppointmentIndexes } = require('../config/db');

const setupTestDatabase = () => {
  const configuredUri = process.env.MONGO_URI;
  assert.ok(configuredUri, 'MONGO_URI must be configured in the process environment or .env file');
  const uri = new URL(configuredUri);
  assert.ok(['mongodb:', 'mongodb+srv:'].includes(uri.protocol), 'MONGO_URI must be a MongoDB URI');
  const originalDatabaseName = decodeURIComponent(uri.pathname.replace(/^\/+/, '')) || 'student_service_portal';
  const suffix = `_apt_${Date.now().toString(36)}_${crypto.randomBytes(3).toString('hex')}`;
  const safeBaseName = originalDatabaseName.replace(/[^A-Za-z0-9_-]/g, '_');
  const testDatabaseName = `${safeBaseName.slice(0, 38 - suffix.length)}${suffix}`;
  assert.ok(Buffer.byteLength(testDatabaseName) <= 38, 'Generated test database name must fit MongoDB limits');
  assert.notEqual(testDatabaseName, originalDatabaseName);
  uri.pathname = `/${encodeURIComponent(testDatabaseName)}`;
  process.env.MONGO_URI = uri.toString();
  return testDatabaseName;
};

const testDatabaseName = setupTestDatabase();
const originalConsoleInfo = console.info;
let loggedEmailCount = 0;
console.info = (message, ...args) => {
  if (message === '[email] Email logged instead of sent') {
    loggedEmailCount += 1;
    return;
  }
  originalConsoleInfo(message, ...args);
};
process.env.JWT_SECRET = crypto.randomBytes(32).toString('hex');
process.env.APPT_MIN_NOTICE_HOURS = '2';
process.env.APPT_MAX_ACTIVE = '2';
process.env.APPT_CANCEL_BEFORE_HOURS = '2';
process.env.APPT_PENDING_EXPIRE_HOURS = '72';
process.env.APPT_PRINCIPAL_PURPOSE_MIN_LENGTH = '30';
process.env.RESEND_API_KEY = '';

const app = express();
app.use(express.json());
app.use('/api/appointments', require('../routes/appointmentRoutes'));

const postBooking = async (baseUrl, token, staffId, date, startTime) => {
  const response = await fetch(`${baseUrl}/api/appointments`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      staffId,
      date,
      startTime,
      purpose: 'Discuss study progress and academic planning',
    }),
  });
  return { status: response.status, body: await response.json() };
};

const patchAppointment = async (baseUrl, token, id, action, body = {}) => {
  const response = await fetch(`${baseUrl}/api/appointments/${id}/${action}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  return { status: response.status, body: await response.json() };
};

const main = async () => {
  let server;
  let passed = 0;
  try {
    await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 15000 });
    await Promise.all([User.init(), ensureAppointmentIndexes(), Availability.init()]);

    const indexes = await Appointment.collection.listIndexes().toArray();
    const slotIndex = indexes.find((index) =>
      index.key?.staffId === 1 &&
      index.key?.date === 1 &&
      index.key?.startTime === 1
    );
    assert.ok(slotIndex, 'Unique staff/date/startTime index must exist');
    assert.equal(slotIndex.unique, true);
    assert.deepEqual(slotIndex.partialFilterExpression, { slotReserved: true });
    assert.ok(!JSON.stringify(slotIndex.partialFilterExpression).includes('$in'));
    console.log('PASS 1: Real MongoDB listIndexes confirms a unique (staffId, date, startTime) partial index:', JSON.stringify({
      key: slotIndex.key,
      unique: slotIndex.unique,
      partialFilterExpression: slotIndex.partialFilterExpression,
    }));
    passed += 1;

    const date = addDays(todayInKolkata(), 14);
    const staff = await User.create({
      name: 'Appointment Test Staff',
      registerNumber: `APT-TSTAFF-${crypto.randomBytes(4).toString('hex')}`,
      email: `apt-staff-${crypto.randomBytes(4).toString('hex')}@example.test`,
      phone: '9000000000',
      department: 'Appointment Integration Tests',
      year: 'N/A',
      semester: 'N/A',
      password: 'integration-test-hash',
      role: 'faculty',
      isDemo: false,
    });
    await Availability.create({
      staffId: staff._id,
      weekday: weekdayForDate(date),
      startTime: '09:00',
      endTime: '17:00',
      slotMinutes: 15,
      active: true,
    });
    await Availability.create({
      staffId: staff._id,
      weekday: weekdayForDate(addDays(todayInKolkata(), -1)),
      startTime: '09:00',
      endTime: '17:00',
      slotMinutes: 15,
      active: true,
    });

    const students = await User.insertMany(Array.from({ length: 20 }, (_, index) => {
      const suffix = `${Date.now().toString(36)}-${index}-${crypto.randomBytes(3).toString('hex')}`;
      return {
        name: `Appointment Test Student ${index + 1}`,
        registerNumber: `APT-STU-${suffix}`,
        email: `apt-student-${suffix}@example.test`,
        phone: '9000000001',
        department: 'Appointment Integration Tests',
        year: 'II',
        semester: '3',
        password: 'integration-test-hash',
        role: 'student',
        isDemo: false,
      };
    }));
    const tokens = new Map(students.map((student) => [
      String(student._id),
      jwt.sign({ id: student._id, role: student.role }, process.env.JWT_SECRET, { expiresIn: '10m' }),
    ]));
    const staffToken = jwt.sign({ id: staff._id, role: staff.role }, process.env.JWT_SECRET, { expiresIn: '10m' });

    server = await new Promise((resolve, reject) => {
      const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
      listener.once('error', reject);
    });
    const baseUrl = `http://127.0.0.1:${server.address().port}`;

    const concurrent = await Promise.all(students.slice(0, 10).map((student) =>
      postBooking(baseUrl, tokens.get(String(student._id)), staff._id, date, '10:00')
    ));
    const created = concurrent.filter((result) => result.status === 201);
    const conflicts = concurrent.filter((result) => result.status === 409);
    assert.equal(created.length, 1);
    assert.equal(conflicts.length, 9);
    assert.ok(conflicts.every((result) => result.body.message === 'Slot already taken'));
    console.log('PASS 2: Real POST /api/appointments concurrency results:', JSON.stringify({
      simultaneousPosts: concurrent.length,
      statusCounts: {
        201: created.length,
        409: conflicts.length,
      },
      conflictMessages: [...new Set(conflicts.map((result) => result.body.message))],
    }));
    passed += 1;

    const raceWinner = created[0].body.appointment;
    const rejectedPast = await postBooking(
      baseUrl,
      tokens.get(String(students[10]._id)),
      staff._id,
      addDays(todayInKolkata(), -1),
      '10:00'
    );
    assert.equal(rejectedPast.status, 400);
    console.log('PASS: Past appointment POST rejected:', JSON.stringify({ status: rejectedPast.status, message: rejectedPast.body.message }));

    const cancelResult = await patchAppointment(
      baseUrl,
      tokens.get(String(raceWinner.studentId)),
      raceWinner._id,
      'cancel'
    );
    assert.equal(cancelResult.status, 200);
    const afterCancel = await postBooking(
      baseUrl,
      tokens.get(String(students[10]._id)),
      staff._id,
      date,
      '10:00'
    );
    assert.equal(afterCancel.status, 201);
    console.log('PASS 3: Cancelling the slot owner frees the slot:', JSON.stringify({
      cancelStatus: cancelResult.status,
      nextStudentBookingStatus: afterCancel.status,
      nextAppointmentId: afterCancel.body.appointment.appointmentId,
    }));
    passed += 1;

    const pending = await postBooking(
      baseUrl,
      tokens.get(String(students[11]._id)),
      staff._id,
      date,
      '11:00'
    );
    assert.equal(pending.status, 201);
    const pendingDuplicate = await postBooking(
      baseUrl,
      tokens.get(String(students[12]._id)),
      staff._id,
      date,
      '11:00'
    );
    assert.equal(pendingDuplicate.status, 409);
    const pendingDoc = await Appointment.findById(pending.body.appointment._id).select('+slotReserved');
    assert.equal(pendingDoc.slotReserved, true);

    const approved = await postBooking(
      baseUrl,
      tokens.get(String(students[13]._id)),
      staff._id,
      date,
      '11:15'
    );
    assert.equal(approved.status, 201);
    const approvedDoc = await Appointment.findById(approved.body.appointment._id);
    approvedDoc.status = 'Approved';
    await approvedDoc.save();
    const approvedDuplicate = await postBooking(
      baseUrl,
      tokens.get(String(students[14]._id)),
      staff._id,
      date,
      '11:15'
    );
    assert.equal(approvedDuplicate.status, 409);
    const approvedStored = await Appointment.findById(approved.body.appointment._id).select('+slotReserved');
    assert.equal(approvedStored.slotReserved, true);

    const rescheduled = await postBooking(
      baseUrl,
      tokens.get(String(students[15]._id)),
      staff._id,
      date,
      '11:30'
    );
    assert.equal(rescheduled.status, 201);
    const decision = await patchAppointment(baseUrl, staffToken, rescheduled.body.appointment._id, 'decision', {
      decision: 'reschedule',
      remark: 'Moved to the next slot',
      newDate: date,
      newStartTime: '11:45',
    });
    assert.equal(decision.status, 200);
    const rescheduledDuplicate = await postBooking(
      baseUrl,
      tokens.get(String(students[16]._id)),
      staff._id,
      date,
      '11:45'
    );
    assert.equal(rescheduledDuplicate.status, 409);
    const rescheduledStored = await Appointment.findById(rescheduled.body.appointment._id).select('+slotReserved');
    assert.equal(rescheduledStored.status, 'Rescheduled');
    assert.equal(rescheduledStored.slotReserved, true);
    const oldRescheduledSlot = await postBooking(
      baseUrl,
      tokens.get(String(students[16]._id)),
      staff._id,
      date,
      '11:30'
    );
    assert.equal(oldRescheduledSlot.status, 201);
    console.log('PASS 4: Real MongoDB slot reservations:', JSON.stringify({
      Pending: { storedSlotReserved: pendingDoc.slotReserved, duplicatePost: pendingDuplicate.status },
      Approved: { storedSlotReserved: approvedStored.slotReserved, duplicatePost: approvedDuplicate.status },
      Rescheduled: { storedSlotReserved: rescheduledStored.slotReserved, newSlotDuplicatePost: rescheduledDuplicate.status },
      releasedRescheduleSlotPost: oldRescheduledSlot.status,
    }));
    passed += 1;
    assert.ok(loggedEmailCount > 0, 'Appointment notifications should be routed to the configured email logger');
    console.log(`PASS: Existing notification email helper logged ${loggedEmailCount} test email(s); no real email provider was configured.`);
    console.log('PASS: Real MongoDB appointment integration checks complete.');
    return passed;
  } finally {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    if (mongoose.connection.readyState === 1 && mongoose.connection.name === testDatabaseName) {
      await mongoose.connection.dropDatabase();
      console.log('PASS: Dropped only the generated throwaway database.');
    }
    await mongoose.disconnect();
    console.info = originalConsoleInfo;
  }
};

main()
  .then((passed) => {
    console.log(`PASS: ${passed} real-MongoDB integration checks completed.`);
  })
  .catch((error) => {
    console.error(`FAIL: Real-MongoDB integration test (${error.name}): ${error.message}`);
    process.exitCode = 1;
  });
