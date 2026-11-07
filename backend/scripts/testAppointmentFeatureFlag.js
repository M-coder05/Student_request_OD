const assert = require('node:assert/strict');
const express = require('express');
const Appointment = require('../models/Appointment');
const Availability = require('../models/Availability');
const User = require('../models/User');

const authMiddlewarePath = require.resolve('../middleware/authMiddleware');
require(authMiddlewarePath);
const originalAuthMiddleware = require.cache[authMiddlewarePath].exports;
const originalAppointmentFind = Appointment.find;
const originalUserFind = User.find;
const originalAvailabilityDistinct = Availability.distinct;
const originalAppointmentsEnabled = process.env.APPOINTMENTS_ENABLED;

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
    Appointment.find = () => ({
      sort() { return this; },
      then(resolve, reject) { return Promise.resolve([]).then(resolve, reject); },
    });
    Availability.distinct = async () => [];
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

    delete process.env.APPOINTMENTS_ENABLED;
    let response = await request('/api/config/features');
    assert.deepEqual(response, { status: 200, body: { appointments: false } });
    console.log('PASS 1: Public feature endpoint defaults appointments to false.');

    process.env.APPOINTMENTS_ENABLED = 'true';
    response = await request('/api/config/features');
    assert.deepEqual(response, { status: 200, body: { appointments: true } });
    console.log('PASS 2: Public feature endpoint reports appointments enabled when configured.');

    process.env.APPOINTMENTS_ENABLED = 'false';
    for (const path of ['/api/appointments/staff', '/api/appointments', '/api/appointments/staff/staff-real/slots?date=2030-01-01']) {
      const options = path.endsWith('/staff') ? {} : { method: 'POST', body: JSON.stringify({}) };
      if (path.includes('/slots?')) Object.assign(options, { method: 'GET', body: undefined });
      response = await request(path, 'real', options);
      assert.equal(response.status, 403);
      assert.equal(response.body.message, 'Appointment booking is not enabled');
    }
    console.log('PASS 3: Disabled real student staff-list, available-slots and booking requests return the required 403.');

    response = await request('/api/appointments/staff', 'demo');
    assert.equal(response.status, 200);
    response = await request('/api/appointments/staff/staff-real/slots?date=2030-01-01', 'demo');
    assert.notEqual(response.status, 403);
    response = await request('/api/appointments', 'demo', { method: 'POST', body: JSON.stringify({}) });
    assert.equal(response.status, 400);
    assert.notEqual(response.body.message, 'Appointment booking is not enabled');
    console.log('PASS 4: Disabled demo student requests bypass the feature gate.');

    process.env.APPOINTMENTS_ENABLED = 'true';
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
    Availability.distinct = originalAvailabilityDistinct;
    require.cache[authMiddlewarePath].exports = originalAuthMiddleware;
    delete require.cache[require.resolve('../routes/appointmentRoutes')];
    if (originalAppointmentsEnabled === undefined) delete process.env.APPOINTMENTS_ENABLED;
    else process.env.APPOINTMENTS_ENABLED = originalAppointmentsEnabled;
  }
};

main().catch((error) => {
  console.error('FAIL: Appointment feature-flag checks did not pass.');
  console.error(error);
  process.exitCode = 1;
});
