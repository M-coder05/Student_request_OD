if (process.env.NODE_ENV === 'production') {
  throw new Error('Refusing to run the staff-management test with NODE_ENV=production');
}

require('express-async-errors');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/User');
const Availability = require('../models/Availability');
const AuditLog = require('../models/AuditLog');
const { ensureAppointmentIndexes } = require('../config/db');

const setupTestDatabase = () => {
  const configuredUri = process.env.MONGO_URI;
  assert.ok(configuredUri, 'Set MONGO_URI in the process environment to run this integration test');
  const uri = new URL(configuredUri);
  assert.ok(['mongodb:', 'mongodb+srv:'].includes(uri.protocol), 'MONGO_URI must be a MongoDB URI');
  const originalDatabaseName = decodeURIComponent(uri.pathname.replace(/^\/+/, '')) || 'student_service_portal';
  const suffix = `_staff_${Date.now().toString(36)}_${crypto.randomBytes(3).toString('hex')}`;
  const safeBaseName = originalDatabaseName.replace(/[^A-Za-z0-9_-]/g, '_');
  const testDatabaseName = `${safeBaseName.slice(0, 38 - suffix.length)}${suffix}`;
  assert.ok(Buffer.byteLength(testDatabaseName) <= 38, 'Generated test database name must fit MongoDB limits');
  assert.notEqual(testDatabaseName, originalDatabaseName);
  uri.pathname = `/${encodeURIComponent(testDatabaseName)}`;
  process.env.MONGO_URI = uri.toString();
  return testDatabaseName;
};

const testDatabaseName = setupTestDatabase();
process.env.JWT_SECRET = crypto.randomBytes(32).toString('hex');
process.env.RESEND_API_KEY = '';

const app = express();
app.use(express.json());
app.use('/api/auth', require('../routes/authRoutes'));
app.use('/api/student', require('../routes/studentRoutes'));
app.use('/api/appointments', require('../routes/appointmentRoutes'));
app.use('/api/admin', require('../routes/adminRoutes'));

const request = async (baseUrl, path, token, method = 'GET', body) => {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return { status: response.status, body: await response.json().catch(() => ({})) };
};

const main = async () => {
  let server;
  let dropped = false;
  try {
    await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 15000 });
    await Promise.all([User.init(), AuditLog.init(), ensureAppointmentIndexes(), Availability.init()]);
    process.env.JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');

    const makeUser = async (role, overrides = {}) => ({
      name: `Staff test ${role}`,
      registerNumber: `STF-${role}-${crypto.randomBytes(5).toString('hex')}`,
      email: `staff-${role}-${crypto.randomBytes(5).toString('hex')}@example.test`,
      phone: '9000000000',
      department: role === 'student' ? 'Mathematics' : '',
      staffDepartment: role === 'faculty' ? 'Mathematics' : '',
      ...(role === 'student' ? { year: 'II', semester: '3' } : {}),
      password: await bcrypt.hash('Integration-password-123', 10),
      role,
      isDemo: role === 'demo_admin',
      isActive: true,
      ...overrides,
    });

    const [superAdmin, admin, student, demoAdmin] = await Promise.all([
      User.create(await makeUser('super_admin')),
      User.create(await makeUser('admin')),
      User.create(await makeUser('student')),
      User.create(await makeUser('demo_admin')),
    ]);
    const tokenFor = (user) => jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '10m' });
    const superToken = tokenFor(superAdmin);
    const adminToken = tokenFor(admin);
    const studentToken = tokenFor(student);
    const demoToken = tokenFor(demoAdmin);

    server = await new Promise((resolve, reject) => {
      const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
      listener.once('error', reject);
    });
    const baseUrl = `http://127.0.0.1:${server.address().port}`;

    const created = await request(baseUrl, '/api/admin/staff', superToken, 'POST', {
      name: 'Integration Faculty',
      email: `faculty-${crypto.randomBytes(5).toString('hex')}@example.test`,
      employeeId: `EMP-${crypto.randomBytes(5).toString('hex')}`,
      phone: '9000000001',
      role: 'faculty',
      staffDepartment: 'Mathematics',
    });
    assert.equal(created.status, 201);
    assert.ok(created.body.temporaryPassword.length >= 12);
    assert.equal(created.body.staff.mustChangePassword, true);
    const staffRecord = await User.findById(created.body.staff._id);
    assert.ok(await bcrypt.compare(created.body.temporaryPassword, staffRecord.password));
    assert.notEqual(staffRecord.password, created.body.temporaryPassword);
    console.log('PASS 1: Super admin created faculty account; one-time temporary password returned, bcrypt-hashed, and mustChangePassword=true.');

    const forbiddenResults = await Promise.all([
      request(baseUrl, '/api/admin/staff', adminToken),
      request(baseUrl, '/api/admin/staff', tokenFor(await User.create(await makeUser('faculty')))),
      request(baseUrl, '/api/admin/staff', studentToken),
      request(baseUrl, '/api/admin/staff', demoToken),
      request(baseUrl, '/api/admin/staff', demoToken, 'POST', {
        name: 'Forbidden Demo Staff',
        email: `forbidden-${crypto.randomBytes(4).toString('hex')}@example.test`,
        employeeId: `FORBIDDEN-${crypto.randomBytes(4).toString('hex')}`,
        phone: '9000000002',
        role: 'faculty',
        staffDepartment: 'Mathematics',
      }),
    ]);
    assert.deepEqual(forbiddenResults.map((result) => result.status), [403, 403, 403, 403, 403]);
    console.log('PASS 2: Non-super admin, staff, student and demo accounts received 403 on staff management; demo create was denied.');

    const duplicateEmail = await request(baseUrl, '/api/admin/staff', superToken, 'POST', {
      name: 'Duplicate Email',
      email: created.body.staff.email.toUpperCase(),
      employeeId: `EMP-EMAIL-${crypto.randomBytes(4).toString('hex')}`,
      phone: '9000000003',
      role: 'faculty',
      staffDepartment: 'Mathematics',
    });
    const duplicateEmployeeId = await request(baseUrl, '/api/admin/staff', superToken, 'POST', {
      name: 'Duplicate Employee',
      email: `duplicate-${crypto.randomBytes(4).toString('hex')}@example.test`,
      employeeId: created.body.staff.employeeId,
      phone: '9000000004',
      role: 'faculty',
      staffDepartment: 'Mathematics',
    });
    assert.equal(duplicateEmail.status, 409);
    assert.equal(duplicateEmployeeId.status, 409);
    console.log(`PASS 3: Duplicate email returned ${duplicateEmail.status}; duplicate employee ID returned ${duplicateEmployeeId.status}.`);

    const mustChangeLogin = await request(baseUrl, '/api/auth/login', '', 'POST', {
      email: staffRecord.email,
      password: created.body.temporaryPassword,
    });
    assert.equal(mustChangeLogin.status, 200);
    assert.equal(mustChangeLogin.body.user.mustChangePassword, true);
    assert.equal(mustChangeLogin.body.user.role, 'faculty');
    assert.equal(mustChangeLogin.body.user.staffDepartment, 'Mathematics');
    const me = await request(baseUrl, '/api/auth/me', mustChangeLogin.body.token);
    const profile = await request(baseUrl, '/api/student/profile', mustChangeLogin.body.token);
    const blockedQueue = await request(baseUrl, '/api/appointments/staff-queue', mustChangeLogin.body.token);
    const blockedAdminEndpoint = await request(baseUrl, '/api/admin/staff', mustChangeLogin.body.token);
    assert.equal(me.status, 200);
    assert.equal(profile.status, 200);
    assert.equal(blockedQueue.status, 403);
    assert.equal(blockedQueue.body.message, 'Password change required');
    assert.equal(blockedAdminEndpoint.status, 403);
    assert.equal(blockedAdminEndpoint.body.message, 'Password change required');
    const passwordChanged = await request(baseUrl, '/api/student/change-password', mustChangeLogin.body.token, 'PUT', {
      currentPassword: created.body.temporaryPassword,
      newPassword: 'Changed-password-123',
      confirmPassword: 'Changed-password-123',
    });
    assert.equal(passwordChanged.status, 200);
    const staffQueue = await request(baseUrl, '/api/appointments/staff-queue', passwordChanged.body.token);
    assert.equal(staffQueue.status, 200);
    assert.equal((await User.findById(staffRecord._id)).mustChangePassword, false);
    console.log('PASS 4: Forced-change login reported staff fields; /auth/me and profile worked, other protected endpoints returned 403 until password change, then queue returned 200.');

    await Availability.create({
      staffId: staffRecord._id,
      weekday: 1,
      startTime: '09:00',
      endTime: '17:00',
      slotMinutes: 30,
      active: true,
    });
    const bookableBeforeDisable = await request(
      baseUrl,
      '/api/appointments/staff?role=faculty&department=Mathematics',
      studentToken
    );
    assert.ok(bookableBeforeDisable.body.staff.some((member) => member._id === String(staffRecord._id)));

    const updatedStaff = await request(baseUrl, `/api/admin/staff/${staffRecord._id}`, superToken, 'PUT', {
      name: 'Integration Faculty Updated',
      phone: '9000000099',
      employeeId: staffRecord.registerNumber,
      role: 'faculty',
      staffDepartment: 'Mathematics',
    });
    assert.equal(updatedStaff.status, 200);
    const disabled = await request(baseUrl, `/api/admin/staff/${staffRecord._id}/status`, superToken, 'PATCH', { isActive: false });
    assert.equal(disabled.status, 200);
    const disabledLogin = await request(baseUrl, '/api/auth/login', '', 'POST', {
      email: staffRecord.email,
      password: 'Changed-password-123',
    });
    assert.equal(disabledLogin.status, 401);
    const bookableAfterDisable = await request(
      baseUrl,
      '/api/appointments/staff?role=faculty&department=Mathematics',
      studentToken
    );
    assert.ok(!bookableAfterDisable.body.staff.some((member) => member._id === String(staffRecord._id)));

    const enabled = await request(baseUrl, `/api/admin/staff/${staffRecord._id}/status`, superToken, 'PATCH', { isActive: true });
    assert.equal(enabled.status, 200);
    const reset = await request(baseUrl, `/api/admin/staff/${staffRecord._id}/reset-password`, superToken, 'POST', {});
    assert.equal(reset.status, 200);
    assert.ok(reset.body.temporaryPassword.length >= 12);
    const resetLogin = await request(baseUrl, '/api/auth/login', '', 'POST', {
      email: staffRecord.email,
      password: reset.body.temporaryPassword,
    });
    assert.equal(resetLogin.status, 200);
    assert.equal(resetLogin.body.user.mustChangePassword, true);
    const disableAgain = await request(baseUrl, `/api/admin/staff/${staffRecord._id}/status`, superToken, 'PATCH', { isActive: false });
    assert.equal(disableAgain.status, 200);
    console.log('PASS 5: Disabled staff login returned 401 and the active-only bookable staff list no longer contained that account.');

    const auditRows = await AuditLog.find({ recordId: staffRecord._id }).lean();
    const auditJson = JSON.stringify(auditRows);
    assert.ok(auditRows.some((row) => row.action === 'staff_created'));
    assert.ok(auditRows.some((row) => row.action === 'staff_updated'));
    assert.ok(auditRows.some((row) => row.action === 'staff_disabled'));
    assert.ok(auditRows.some((row) => row.action === 'staff_enabled'));
    assert.ok(auditRows.some((row) => row.action === 'staff_password_reset'));
    assert.ok(!auditJson.includes(created.body.temporaryPassword));
    assert.ok(!auditJson.includes(reset.body.temporaryPassword));
    assert.ok(auditRows.every((row) => !Object.keys(row).some((key) => /password/i.test(key))));
    console.log('PASS 6: AuditLog contains create, update, enable, disable and reset entries with no password fields or temporary-password values.');

    console.log('PASS: All staff-management real-MongoDB checks completed.');
  } finally {
    if (server) await new Promise((resolve) => server.close(resolve));
    if (mongoose.connection.readyState === 1 && mongoose.connection.name === testDatabaseName) {
      await mongoose.connection.db.dropDatabase();
      dropped = true;
    }
    await mongoose.disconnect();
    if (dropped) console.log('PASS: Dropped only the generated throwaway database.');
  }
};

main().catch((error) => {
  console.error('FAIL: Staff-management MongoDB integration check failed:', error.message);
  process.exitCode = 1;
});
