const assert = require('node:assert/strict');
const express = require('express');
const Appointment = require('../models/Appointment');
const Availability = require('../models/Availability');
const User = require('../models/User');
const {
  getBookableAppointmentRoles,
} = require('../config/featureFlags');

const authMiddlewarePath = require.resolve('../middleware/authMiddleware');
require(authMiddlewarePath);
const originalAuthMiddleware = require.cache[authMiddlewarePath].exports;
const originalAppointmentFind = Appointment.find;
const originalUserFind = User.find;
const originalUserFindOne = User.findOne;
const originalAvailabilityDistinct = Availability.distinct;
const originalAvailabilityFindOne = Availability.findOne;
const originalAppointmentBookableRoles = process.env.APPOINTMENT_BOOKABLE_ROLES;
const originalAppointmentsEnabled = process.env.APPOINTMENTS_ENABLED;

const staffMembers = {
  real: {
    _id: '507f1f77bcf86cd799439011',
    name: 'Real Faculty',
    role: 'faculty',
    isActive: true,
    isDemo: false,
  },
  demo: {
    _id: '507f1f77bcf86cd799439012',
    name: 'Demo Faculty',
    role: 'faculty',
    isActive: true,
    isDemo: true,
  },
  principal: {
    _id: '507f1f77bcf86cd799439013',
    name: 'Principal',
    role: 'principal',
    isActive: true,
    isDemo: false,
  },
};

const users = {
  real: { _id: 'student-real', role: 'student', isDemo: false },
  demo: { _id: 'student-demo', role: 'student', isDemo: true },
  staff: { _id: 'staff-real', role: 'faculty', isDemo: false },
  admin: { _id: 'admin-real', role: 'admin', isDemo: false },
};

const main = async () => {
  let server;
  try {
    User.find = () => ({
      select() { return this; },
      sort() { return Promise.resolve([]); },
    });
    User.findOne = (filter) => {
      const staff = Object.values(staffMembers).find((member) =>
        member._id === String(filter._id) && member.isDemo === (filter.isDemo === true)
      );
      return {
        select() { return this; },
        then(resolve, reject) { return Promise.resolve(staff || null).then(resolve, reject); },
      };
    };
    Appointment.find = () => ({
      sort() { return this; },
      then(resolve, reject) { return Promise.resolve([]).then(resolve, reject); },
    });
    Availability.distinct = async () => [];
    Availability.findOne = async () => null;
    require.cache[authMiddlewarePath].exports = (req, res, next) => {
      req.user = users[req.get('x-test-user')] || users.real;
      next();
    };

    const app = express();
    app.use(express.json());
    app.use('/api/config', require('../routes/configRoutes'));
    app.use('/api/appointments', require('../routes/appointmentRoutes'));
    server = await new Promise((resolve) => {
      const instance = app.listen(0, '127.0.0.1', () => resolve(instance));
    });
    const baseUrl = `http://127.0.0.1:${server.address().port}`;
    const request = async (path, user = 'real', options = {}) => {
      const response = await fetch(`${baseUrl}${path}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'x-test-user': user,
          ...(options.headers || {}),
        },
      });
      return { status: response.status, body: await response.json() };
    };

    delete process.env.APPOINTMENT_BOOKABLE_ROLES;
    assert.deepEqual(getBookableAppointmentRoles(), ['faculty', 'hod']);
    process.env.APPOINTMENT_BOOKABLE_ROLES = 'hod, principal,unknown,faculty,hod';
    assert.deepEqual(getBookableAppointmentRoles(), ['hod', 'principal', 'faculty']);
    process.env.APPOINTMENT_BOOKABLE_ROLES = 'junk,unknown';
    assert.deepEqual(getBookableAppointmentRoles(), ['faculty', 'hod']);
    console.log('PASS: Bookable appointment roles default, accept custom roles, ignore unknown values and fall back for junk-only values.');

    delete process.env.APPOINTMENTS_ENABLED;
    let response = await request('/api/config/features');
    assert.deepEqual(response, { status: 200, body: { appointments: false } });
    console.log('PASS 1: Public feature endpoint defaults appointments to false.');

    process.env.APPOINTMENTS_ENABLED = 'true';
    response = await request('/api/config/features');
    assert.deepEqual(response, { status: 200, body: { appointments: true } });
    console.log('PASS 2: Public feature endpoint reports appointments enabled when configured.');

    process.env.APPOINTMENTS_ENABLED = 'false';
    for (const path of [
      '/api/appointments/staff',
      '/api/appointments',
      `/api/appointments/staff/${staffMembers.real._id}/slots?date=2030-01-01`,
    ]) {
      const options = path.endsWith('/staff') ? {} : { method: 'POST', body: JSON.stringify({}) };
      if (path.includes('/slots?')) Object.assign(options, { method: 'GET', body: undefined });
      response = await request(path, 'real', options);
      assert.equal(response.status, 403);
      assert.equal(response.body.message, 'Appointment booking is not enabled');
    }
    console.log('PASS 3: Disabled real student staff-list, available-slots and booking requests return the required 403.');

    response = await request('/api/appointments/staff', 'demo');
    assert.equal(response.status, 200);
    response = await request(`/api/appointments/staff/${staffMembers.demo._id}/slots?date=2030-01-01`, 'demo');
    assert.equal(response.status, 200);
    response = await request('/api/appointments', 'demo', { method: 'POST', body: JSON.stringify({}) });
    assert.equal(response.status, 400);
    assert.notEqual(response.body.message, 'Appointment booking is not enabled');
    console.log('PASS 4: Disabled demo student requests bypass the feature gate.');

    delete process.env.APPOINTMENT_BOOKABLE_ROLES;
    process.env.APPOINTMENTS_ENABLED = 'true';
    response = await request('/api/appointments/staff');
    assert.deepEqual(response.body.roles, ['faculty', 'hod']);
    process.env.APPOINTMENT_BOOKABLE_ROLES = 'faculty,hod';
    response = await request('/api/appointments/staff?role=principal');
    assert.equal(response.status, 400);
    assert.equal(response.body.message, 'That role is not available for booking');
    response = await request('/api/appointments', 'real', {
      method: 'POST',
      body: JSON.stringify({
        staffId: staffMembers.principal._id,
        date: '2030-01-01',
        startTime: '10:00',
        purpose: 'A sufficiently long purpose for the Principal meeting.',
      }),
    });
    assert.equal(response.status, 400);
    assert.equal(response.body.message, 'That role is not available for booking');
    console.log('PASS: Principal lookup and booking are rejected with HTTP 400 when Principal is not an allowed role.');

    for (const user of ['real', 'demo']) {
      response = await request('/api/appointments/staff', user);
      assert.equal(response.status, 200);
      response = await request('/api/appointments', user, { method: 'POST', body: JSON.stringify({}) });
      assert.equal(response.status, 400);
      assert.notEqual(response.body.message, 'Appointment booking is not enabled');
    }
    console.log('PASS 5: Enabled real and demo students both pass the feature gate.');

    process.env.APPOINTMENTS_ENABLED = 'false';
    for (const user of ['staff', 'admin']) {
      response = await request('/api/appointments/staff-queue', user);
      assert.equal(response.status, 200);
      assert.deepEqual(response.body.appointments, []);
    }
    console.log('PASS 6: Staff and admin appointment queues remain available while student booking is disabled.');
  } finally {
    if (server) await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
    Appointment.find = originalAppointmentFind;
    User.find = originalUserFind;
    User.findOne = originalUserFindOne;
    Availability.distinct = originalAvailabilityDistinct;
    Availability.findOne = originalAvailabilityFindOne;
    require.cache[authMiddlewarePath].exports = originalAuthMiddleware;
    delete require.cache[require.resolve('../routes/appointmentRoutes')];
    if (originalAppointmentsEnabled === undefined) delete process.env.APPOINTMENTS_ENABLED;
    else process.env.APPOINTMENTS_ENABLED = originalAppointmentsEnabled;
    if (originalAppointmentBookableRoles === undefined) delete process.env.APPOINTMENT_BOOKABLE_ROLES;
    else process.env.APPOINTMENT_BOOKABLE_ROLES = originalAppointmentBookableRoles;
  }
};

main().catch((error) => {
  console.error('FAIL: Appointment feature-flag checks did not pass.');
  console.error(error);
  process.exitCode = 1;
});
