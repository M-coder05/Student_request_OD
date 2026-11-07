if (process.env.NODE_ENV === 'production') {
  throw new Error('Refusing to run the password-reset test with NODE_ENV=production');
}

require('express-async-errors');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/User');
const PasswordResetRequest = require('../models/PasswordResetRequest');
const AuditLog = require('../models/AuditLog');

const setupTestDatabase = () => {
  const configuredUri = process.env.MONGO_URI;
  assert.ok(configuredUri, 'Set MONGO_URI in the process environment to run this integration test');
  const uri = new URL(configuredUri);
  assert.ok(['mongodb:', 'mongodb+srv:'].includes(uri.protocol), 'MONGO_URI must be a MongoDB URI');
  const originalDatabaseName = decodeURIComponent(uri.pathname.replace(/^\/+/, '')) || 'student_service_portal';
  const suffix = `_pwreset_${Date.now().toString(36)}_${crypto.randomBytes(3).toString('hex')}`;
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
process.env.JWT_SECRET = crypto.randomBytes(32).toString('hex');
process.env.PASSWORD_RESET_EMAIL = 'true';
process.env.RESEND_API_KEY = 'test-key';
process.env.MAIL_FROM = 'Portal Test <portal@example.test>';
process.env.FRONTEND_URL = 'https://portal.example.test';

const emails = [];
const originalFetch = global.fetch;
global.fetch = async (input, options) => {
  if (String(input) === 'https://api.resend.com/emails') {
    emails.push(JSON.parse(options.body));
    return new Response(JSON.stringify({ id: 'test-email' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  return originalFetch(input, options);
};

const app = express();
app.set('trust proxy', 1);
app.use(express.json());
app.use('/api/auth', require('../routes/authRoutes'));
app.use('/api/student', require('../routes/studentRoutes'));
app.use('/api/appointments', require('../routes/appointmentRoutes'));
app.use('/api/admin', require('../routes/adminRoutes'));

const request = async (baseUrl, path, token, method = 'GET', body, ip) => {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(ip ? { 'X-Forwarded-For': ip } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return { status: response.status, body: await response.json().catch(() => ({})) };
};

const requestFrom = (baseUrl, path, body, ip) => request(baseUrl, path, '', 'POST', body, ip);

const main = async () => {
  let server;
  let dropped = false;
  try {
    await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 15000 });
    await Promise.all([User.init(), PasswordResetRequest.init(), AuditLog.init()]);

    const makeUser = async (role, overrides = {}) => ({
      name: `Reset test ${role}`,
      registerNumber: `PR-${role}-${crypto.randomBytes(5).toString('hex')}`,
      email: `reset-${role}-${crypto.randomBytes(5).toString('hex')}@example.test`,
      phone: '9000000000',
      department: role === 'student' ? 'Mathematics' : '',
      staffDepartment: role === 'faculty' ? 'Mathematics' : '',
      year: role === 'student' ? 'II' : undefined,
      semester: role === 'student' ? '3' : undefined,
      password: await bcrypt.hash('Original-password-1', 10),
      role,
      isDemo: role === 'demo_admin',
      isActive: true,
      ...overrides,
    });

    const [admin, superAdmin, student, emailStudent, lockStudent, expiredStudent, staff, demoStudent, disabledStudent] = await Promise.all([
      User.create(await makeUser('admin')),
      User.create(await makeUser('super_admin')),
      User.create(await makeUser('student')),
      User.create(await makeUser('student')),
      User.create(await makeUser('student')),
      User.create(await makeUser('student')),
      User.create(await makeUser('faculty')),
      User.create(await makeUser('student', { isDemo: true })),
      User.create(await makeUser('student', { isActive: false })),
    ]);

    const tokenFor = (user) => jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '30m' });
    const adminToken = tokenFor(admin);
    const superToken = tokenFor(superAdmin);
    const studentToken = tokenFor(student);

    server = await new Promise((resolve, reject) => {
      const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
      listener.once('error', reject);
    });
    const baseUrl = `http://127.0.0.1:${server.address().port}`;

    const knownResponse = await requestFrom(
      baseUrl,
      '/api/auth/forgot-password',
      { identifier: student.email },
      '198.51.100.10'
    );
    const unknownResponse = await requestFrom(
      baseUrl,
      '/api/auth/forgot-password',
      { identifier: `missing-${crypto.randomBytes(4).toString('hex')}@example.test` },
      '198.51.100.11'
    );
    assert.equal(knownResponse.status, 200);
    assert.deepEqual(knownResponse.body, unknownResponse.body);
    assert.equal(knownResponse.body.message, 'If an account matches, your request has been recorded');
    await requestFrom(baseUrl, '/api/auth/forgot-password', { identifier: student.registerNumber }, '198.51.100.12');
    const pendingRequest = await PasswordResetRequest.findOne({ userId: student._id, status: 'Pending' });
    assert.ok(pendingRequest);
    assert.equal(pendingRequest.identifierUsed, student.email);
    assert.ok(pendingRequest.requestIp);
    assert.equal(await PasswordResetRequest.countDocuments({ userId: student._id, status: 'Pending' }), 1);
    console.log('PASS 1: Known and unknown identifiers returned the same generic 200 response; repeated requests reused one Pending record.');

    const beforeIgnoredRequests = await PasswordResetRequest.countDocuments();
    await requestFrom(baseUrl, '/api/auth/forgot-password', { identifier: demoStudent.registerNumber }, '198.51.100.13');
    await requestFrom(baseUrl, '/api/auth/forgot-password', { identifier: disabledStudent.registerNumber }, '198.51.100.14');
    assert.equal(await PasswordResetRequest.countDocuments(), beforeIgnoredRequests);
    console.log('PASS 2: Demo and disabled accounts were ignored without creating reset requests.');

    const staffRequest = await requestFrom(
      baseUrl,
      '/api/auth/forgot-password',
      { identifier: staff.registerNumber },
      '198.51.100.15'
    );
    assert.equal(staffRequest.status, 200);
    const staffResetRequest = await PasswordResetRequest.findOne({ userId: staff._id, status: 'Pending' });
    const adminList = await request(baseUrl, '/api/admin/password-resets', adminToken);
    const superList = await request(baseUrl, '/api/admin/password-resets', superToken);
    const studentList = await request(baseUrl, '/api/admin/password-resets', studentToken);
    assert.equal(adminList.status, 200);
    assert.ok(!adminList.body.requests.some((item) => String(item.userId) === String(staff._id)));
    assert.ok(superList.body.requests.some((item) => String(item.userId) === String(staff._id)));
    assert.equal(studentList.status, 403);
    const dashboard = await request(baseUrl, '/api/admin/dashboard', adminToken);
    assert.ok(dashboard.body.pendingPasswordResets >= 1);
    const unauthorizedIssue = await request(
      baseUrl,
      `/api/admin/password-resets/${staffResetRequest._id}/issue`,
      studentToken,
      'POST',
      { identityVerified: true }
    );
    assert.equal(unauthorizedIssue.status, 403);
    const hiddenStaffIssue = await request(
      baseUrl,
      `/api/admin/password-resets/${staffResetRequest._id}/issue`,
      adminToken,
      'POST',
      { identityVerified: true }
    );
    assert.equal(hiddenStaffIssue.status, 404);
    console.log('PASS 3: Student requests were visible to admins, staff requests only to the Super Admin, and unauthorized users could not issue them.');

    const studentResetRequest = await PasswordResetRequest.findOne({ userId: student._id, status: 'Pending' });
    const missingVerification = await request(
      baseUrl,
      `/api/admin/password-resets/${studentResetRequest._id}/issue`,
      adminToken,
      'POST',
      { identityVerified: false }
    );
    assert.equal(missingVerification.status, 400);
    assert.equal((await PasswordResetRequest.findById(studentResetRequest._id)).status, 'Pending');

    const oldStudentToken = tokenFor(student);
    const issued = await request(
      baseUrl,
      `/api/admin/password-resets/${studentResetRequest._id}/issue`,
      adminToken,
      'POST',
      { identityVerified: true }
    );
    assert.equal(issued.status, 200);
    assert.match(issued.body.temporaryPassword, /^[ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789]{14}$/);
    assert.match(issued.body.temporaryPassword, /[ABCDEFGHJKLMNPQRSTUVWXYZ]/);
    assert.match(issued.body.temporaryPassword, /[abcdefghijkmnpqrstuvwxyz]/);
    assert.match(issued.body.temporaryPassword, /[23456789]/);
    const issuedStudent = await User.findById(student._id);
    assert.ok(await bcrypt.compare(issued.body.temporaryPassword, issuedStudent.password));
    assert.notEqual(issuedStudent.password, issued.body.temporaryPassword);
    assert.equal(issuedStudent.mustChangePassword, true);
    assert.equal((await PasswordResetRequest.findById(studentResetRequest._id)).status, 'Issued');
    const repeatedIssue = await request(
      baseUrl,
      `/api/admin/password-resets/${studentResetRequest._id}/issue`,
      adminToken,
      'POST',
      { identityVerified: true }
    );
    assert.equal(repeatedIssue.status, 404);
    assert.equal(repeatedIssue.body.temporaryPassword, undefined);
    const oldSession = await request(baseUrl, '/api/student/profile', oldStudentToken);
    assert.equal(oldSession.status, 401);
    const tempLogin = await request(baseUrl, '/api/auth/login', '', 'POST', {
      email: student.email,
      password: issued.body.temporaryPassword,
    }, '198.51.100.16');
    assert.equal(tempLogin.status, 200);
    assert.equal(tempLogin.body.user.mustChangePassword, true);
    const forcedChange = await request(baseUrl, '/api/student/change-password', tempLogin.body.token, 'PUT', {
      currentPassword: issued.body.temporaryPassword,
      newPassword: 'Student-new-password-1',
      confirmPassword: 'Student-new-password-1',
    });
    assert.equal(forcedChange.status, 200);
    assert.equal((await User.findById(student._id)).mustChangePassword, false);
    const issuedStaff = await request(
      baseUrl,
      `/api/admin/password-resets/${staffResetRequest._id}/issue`,
      superToken,
      'POST',
      { identityVerified: true }
    );
    assert.equal(issuedStaff.status, 200);
    assert.ok(await bcrypt.compare(issuedStaff.body.temporaryPassword, (await User.findById(staff._id)).password));
    console.log('PASS 4: Identity verification was mandatory; issued credentials were 14-character, bcrypt-hashed, returned once, invalidated old sessions, and triggered forced change.');

    const emailForgot = await requestFrom(
      baseUrl,
      '/api/auth/forgot-password',
      { identifier: emailStudent.email },
      '198.51.100.17'
    );
    assert.equal(emailForgot.status, 200);
    const emailRequest = await PasswordResetRequest.findOne({ userId: emailStudent._id, status: 'Pending' })
      .select('+resetTokenHash +resetTokenExpiresAt +resetTokenUsedAt');
    const email = emails.at(-1);
    const resetToken = email?.text.match(/reset-password\/([A-Za-z0-9_-]+)/)?.[1];
    assert.ok(resetToken);
    assert.equal(emailRequest.resetTokenHash, crypto.createHash('sha256').update(resetToken).digest('hex'));
    assert.notEqual(emailRequest.resetTokenHash, resetToken);
    assert.ok(emailRequest.resetTokenExpiresAt.getTime() > Date.now() + 29 * 60 * 1000);
    assert.ok(emailRequest.resetTokenExpiresAt.getTime() <= Date.now() + 30 * 60 * 1000 + 1000);
    const oldEmailToken = tokenFor(emailStudent);
    const samePassword = await request(baseUrl, '/api/auth/reset-password', '', 'POST', {
      token: resetToken,
      newPassword: 'Original-password-1',
    });
    assert.equal(samePassword.status, 400);
    const shortPassword = await request(baseUrl, '/api/auth/reset-password', '', 'POST', {
      token: resetToken,
      newPassword: 'short7',
    });
    assert.equal(shortPassword.status, 400);
    const resetResult = await request(baseUrl, '/api/auth/reset-password', '', 'POST', {
      token: resetToken,
      newPassword: 'Email-reset-password-2',
    });
    assert.equal(resetResult.status, 200);
    const usedToken = await request(baseUrl, '/api/auth/reset-password', '', 'POST', {
      token: resetToken,
      newPassword: 'Email-reset-password-3',
    });
    assert.equal(usedToken.status, 400);
    const invalidToken = await request(baseUrl, '/api/auth/reset-password', '', 'POST', {
      token: crypto.randomBytes(32).toString('base64url'),
      newPassword: 'Another-reset-password-2',
    });
    assert.equal(invalidToken.status, usedToken.status);
    assert.equal(invalidToken.body.message, usedToken.body.message);
    const oldEmailSession = await request(baseUrl, '/api/student/profile', oldEmailToken);
    assert.equal(oldEmailSession.status, 401);
    assert.equal((await PasswordResetRequest.findById(emailRequest._id)).status, 'Completed');

    const expiredRequestResponse = await requestFrom(
      baseUrl,
      '/api/auth/forgot-password',
      { identifier: expiredStudent.email },
      '198.51.100.18'
    );
    assert.equal(expiredRequestResponse.status, 200);
    const expiredRequest = await PasswordResetRequest.findOne({ userId: expiredStudent._id })
      .select('+resetTokenHash +resetTokenExpiresAt');
    const expiredToken = emails.at(-1).text.match(/reset-password\/([A-Za-z0-9_-]+)/)[1];
    await PasswordResetRequest.updateOne({ _id: expiredRequest._id }, { $set: { resetTokenExpiresAt: new Date(Date.now() - 1000) } });
    const expiredResult = await request(baseUrl, '/api/auth/reset-password', '', 'POST', {
      token: expiredToken,
      newPassword: 'Expired-reset-password-1',
    });
    assert.equal(expiredResult.status, usedToken.status);
    assert.equal(expiredResult.body.message, usedToken.body.message);
    console.log('PASS 5: Email tokens were SHA-256 hashed, expired after 30 minutes, single-use, and all invalid/used/expired tokens shared one error; prior sessions were invalidated.');

    const lockResponses = [];
    for (let attempt = 0; attempt < 5; attempt += 1) {
      lockResponses.push(await request(baseUrl, '/api/auth/login', '', 'POST', {
        email: lockStudent.email,
        password: 'Definitely-wrong',
      }, '198.51.100.19'));
    }
    assert.deepEqual(lockResponses.map((result) => result.status), [401, 401, 401, 401, 423]);
    assert.equal(lockResponses[4].body.message, 'Too many attempts. Try again later or use Forgot password.');
    let lockedAccount = await User.findById(lockStudent._id);
    assert.equal(lockedAccount.loginAttempts, 5);
    assert.ok(lockedAccount.lockUntil.getTime() > Date.now() + 14 * 60 * 1000);
    const blockedLogin = await request(baseUrl, '/api/auth/login', '', 'POST', {
      email: lockStudent.email,
      password: 'Original-password-1',
    }, '198.51.100.19');
    assert.equal(blockedLogin.status, 423);
    await User.updateOne({ _id: lockStudent._id }, { $set: { lockUntil: new Date(Date.now() - 1000) } });
    const unlockedLogin = await request(baseUrl, '/api/auth/login', '', 'POST', {
      email: lockStudent.email,
      password: 'Original-password-1',
    }, '198.51.100.19');
    assert.equal(unlockedLogin.status, 200);
    lockedAccount = await User.findById(lockStudent._id);
    assert.equal(lockedAccount.loginAttempts, 0);
    assert.equal(lockedAccount.lockUntil, null);
    const pendingForDismissal = await requestFrom(
      baseUrl,
      '/api/auth/forgot-password',
      { identifier: lockStudent.registerNumber },
      '198.51.100.21'
    );
    assert.equal(pendingForDismissal.status, 200);
    const dismissalRequest = await PasswordResetRequest.findOne({ userId: lockStudent._id, status: 'Pending' });
    const dismissed = await request(
      baseUrl,
      `/api/admin/password-resets/${dismissalRequest._id}/dismiss`,
      adminToken,
      'POST'
    );
    assert.equal(dismissed.status, 200);
    console.log('PASS 6: Five consecutive failures locked the student account for 15 minutes; the account unlocked after expiry and successful login reset counters.');

    const ownerFailures = [];
    for (let attempt = 0; attempt < 5; attempt += 1) {
      ownerFailures.push(await request(baseUrl, '/api/auth/login', '', 'POST', {
        email: superAdmin.email,
        password: 'Definitely-wrong',
      }, '198.51.100.20'));
    }
    assert.ok(ownerFailures.every((result) => result.status === 401));
    const owner = await User.findById(superAdmin._id);
    assert.equal(owner.loginAttempts, 0);
    assert.equal(owner.lockUntil, null);
    console.log('PASS 7: Super Admin remained unlockable after repeated failures; account-based lockout did not apply.');

    const auditRows = await AuditLog.find({ recordType: 'PasswordResetRequest' }).lean();
    const auditJson = JSON.stringify(auditRows);
    assert.ok(auditRows.some((row) => row.action === 'password_reset_requested'));
    assert.ok(auditRows.some((row) => row.action === 'password_reset_issue_rejected'));
    assert.ok(auditRows.some((row) => row.action === 'password_reset_issued'));
    assert.ok(auditRows.some((row) => row.action === 'password_reset_dismissed'));
    assert.ok(auditRows.some((row) => row.action === 'password_reset_completed'));
    assert.ok(!auditJson.includes(issued.body.temporaryPassword));
    assert.ok(!auditJson.includes(resetToken));
    assert.ok(!auditJson.includes('Email-reset-password-2'));
    assert.ok(auditRows.every((row) => !Object.keys(row).some((key) => /password/i.test(key))));
    const resetMailLog = [];
    console.info = (...args) => resetMailLog.push(args.join(' '));
    const sendMail = require('../utils/mailer');
    process.env.RESEND_API_KEY = '';
    const redactionToken = 'reset-link-secret-must-not-be-logged';
    await sendMail({ to: 'student@example.test', subject: 'Reset', text: redactionToken, sensitive: true });
    console.info = originalConsoleInfo;
    assert.ok(!resetMailLog.join(' ').includes(redactionToken));
    console.log('PASS 8: Password-reset audit records contained actor/action data and no passwords or tokens; sensitive email preview logs redacted reset-link content.');
    console.log('PASS: All password-reset and lockout MongoDB integration checks completed.');
  } finally {
    console.info = originalConsoleInfo;
    global.fetch = originalFetch;
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
  console.error('FAIL: Password-reset MongoDB integration check failed:', error.message);
  process.exitCode = 1;
});
