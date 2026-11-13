const assert = require('node:assert/strict');
const express = require('express');
const http = require('node:http');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const Availability = require('../models/Availability');
const { validateStaffDetails } = require('../utils/staffDetails');
const {
  createStaffAccount,
  updateStaffAccount,
} = require('../controllers/adminController');
const { getBookableStaff } = require('../controllers/appointmentController');

const originalMethods = {
  userFind: User.find,
  userFindOne: User.findOne,
  userExists: User.exists,
  userCreate: User.create,
  auditCreate: AuditLog.create,
  availabilityDistinct: Availability.distinct,
};

const staffMembers = [
  {
    _id: '507f1f77bcf86cd799439011',
    name: 'Faculty One',
    role: 'faculty',
    department: 'Engineering',
    staffDepartment: 'Engineering',
    designation: 'Assistant Professor',
    officeLocation: 'Block B, Room 204',
    officeHours: 'Mon to Fri, 10:00 to 12:00',
    meetingTopics: 'Projects, internships',
    email: 'faculty@example.test',
    phone: '9000000001',
    registerNumber: 'EMP-001',
    isActive: true,
    isDemo: false,
  },
];

const query = (value) => {
  const result = {
    select() { return result; },
    sort() { return result; },
    then(resolve, reject) { return Promise.resolve(value).then(resolve, reject); },
  };
  return result;
};

const response = () => ({
  statusCode: 200,
  body: undefined,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(body) {
    this.body = body;
    return this;
  },
});

const run = async () => {
  const valid = validateStaffDetails({
    designation: '  Assistant Professor  ',
    officeLocation: 'Block B, Room 204',
    officeHours: 'Mon to Fri, 10:00 to 12:00',
    meetingTopics: 'Projects, internships',
  });
  assert.equal(valid.error, undefined);
  assert.deepEqual(valid.value, {
    designation: 'Assistant Professor',
    officeLocation: 'Block B, Room 204',
    officeHours: 'Mon to Fri, 10:00 to 12:00',
    meetingTopics: 'Projects, internships',
  });
  assert.deepEqual(validateStaffDetails({}), { value: {} });
  console.log('PASS: Valid staff details are trimmed and returned.');

  const invalidDetails = [
    { designation: 'a'.repeat(81) },
    { officeLocation: 'a'.repeat(81) },
    { officeHours: 'a'.repeat(121) },
    { meetingTopics: 'a'.repeat(161) },
    { designation: 42 },
    { officeLocation: ['Block B'] },
    { officeHours: null },
    { meetingTopics: '<script>alert(1)</script>' },
    { designation: 'Faculty <b>One</b>' },
    { officeHours: 'Mon\u0000Fri' },
    { meetingTopics: 'Projects\nInternships' },
  ];
  for (const body of invalidDetails) {
    const result = validateStaffDetails(body);
    assert.equal(typeof result.error, 'string', `Expected an error for ${JSON.stringify(body)}`);
  }
  console.log('PASS: Too-long, non-string, HTML and control-character values are rejected.');

  User.find = (filter) => {
    const roleFilter = filter.role;
    const roles = roleFilter && typeof roleFilter === 'object' && '$in' in roleFilter
      ? roleFilter.$in
      : roleFilter
        ? [roleFilter]
        : null;
    return query(staffMembers.filter((member) => (
      (!roles || roles.includes(member.role)) &&
      member.isDemo === filter.isDemo
    )));
  };
  Availability.distinct = async () => [staffMembers[0]._id];

  const listResponse = response();
  await getBookableStaff({ user: { role: 'student', isDemo: false }, query: {} }, listResponse);
  assert.equal(listResponse.statusCode, 200);
  assert.equal(listResponse.body.staff.length, 1);
  const listedStaff = listResponse.body.staff[0];
  assert.equal(listedStaff.designation, 'Assistant Professor');
  assert.equal(listedStaff.officeLocation, 'Block B, Room 204');
  assert.equal(listedStaff.officeHours, 'Mon to Fri, 10:00 to 12:00');
  assert.equal(listedStaff.meetingTopics, 'Projects, internships');
  assert.equal(Object.prototype.hasOwnProperty.call(listedStaff, 'email'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(listedStaff, 'phone'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(listedStaff, 'registerNumber'), false);
  console.log('PASS: The student staff list returns the new fields without email, phone or register number.');

  const created = [];
  User.exists = async () => null;
  User.create = async (data) => {
    const staff = {
      _id: '507f1f77bcf86cd799439099',
      ...data,
      isActive: data.isActive !== false,
    };
    created.push(staff);
    return staff;
  };
  AuditLog.create = async (data) => data;

  const createBody = {
    name: 'Faculty Two',
    email: 'faculty2@example.test',
    employeeId: 'EMP-002',
    phone: '9000000002',
    role: 'faculty',
    staffDepartment: 'Engineering',
    designation: 'Professor',
    officeLocation: 'Block C, Room 12',
    officeHours: 'Mon to Fri, 14:00 to 16:00',
    meetingTopics: 'Research, projects',
  };
  const superAdmin = { _id: '507f1f77bcf86cd7994390aa', name: 'Super Admin', role: 'super_admin', isDemo: false };
  const createResponse = response();
  await createStaffAccount({ user: superAdmin, body: createBody }, createResponse);
  assert.equal(createResponse.statusCode, 201);
  assert.equal(createResponse.body.staff.designation, 'Professor');
  assert.equal(createResponse.body.staff.officeLocation, 'Block C, Room 12');
  assert.equal(createResponse.body.staff.officeHours, 'Mon to Fri, 14:00 to 16:00');
  assert.equal(createResponse.body.staff.meetingTopics, 'Research, projects');
  assert.equal(created[0].designation, 'Professor');
  assert.equal(created[0].officeLocation, 'Block C, Room 12');
  console.log('PASS: A super admin can create a staff account with the new details.');

  const rejectedResponse = response();
  await createStaffAccount({
    user: superAdmin,
    body: { ...createBody, email: 'faculty3@example.test', employeeId: 'EMP-003', meetingTopics: '<script>alert(1)</script>' },
  }, rejectedResponse);
  assert.equal(rejectedResponse.statusCode, 400);
  assert.equal(created.length, 1);
  console.log('PASS: A staff create request with HTML is rejected before saving.');

  const existingStaff = {
    _id: '507f1f77bcf86cd799439012',
    name: 'Faculty One',
    role: 'faculty',
    staffDepartment: 'Engineering',
    department: 'Engineering',
    designation: '',
    officeLocation: '',
    officeHours: '',
    meetingTopics: '',
    async save() { return this; },
  };
  User.findOne = async () => existingStaff;

  const updateResponse = response();
  await updateStaffAccount({
    params: { id: existingStaff._id },
    user: superAdmin,
    body: {
      designation: 'Associate Professor',
      officeLocation: 'Block A, Room 5',
      officeHours: 'Tue and Thu, 09:00 to 10:00',
      meetingTopics: 'Exams, study plans',
    },
  }, updateResponse);
  assert.equal(updateResponse.statusCode, 200);
  assert.equal(existingStaff.designation, 'Associate Professor');
  assert.equal(existingStaff.officeLocation, 'Block A, Room 5');
  assert.equal(existingStaff.officeHours, 'Tue and Thu, 09:00 to 10:00');
  assert.equal(existingStaff.meetingTopics, 'Exams, study plans');
  assert.equal(updateResponse.body.staff.designation, 'Associate Professor');
  console.log('PASS: A super admin can update the staff details.');

  const invalidUpdateResponse = response();
  await updateStaffAccount({
    params: { id: existingStaff._id },
    user: superAdmin,
    body: { officeHours: 'Mon\u0000Fri' },
  }, invalidUpdateResponse);
  assert.equal(invalidUpdateResponse.statusCode, 400);
  assert.equal(existingStaff.officeHours, 'Tue and Thu, 09:00 to 10:00');
  console.log('PASS: An invalid staff detail update is rejected without changing the record.');

  const authMiddlewarePath = require.resolve('../middleware/authMiddleware');
  require(authMiddlewarePath);
  const originalAuthMiddleware = require.cache[authMiddlewarePath].exports;
  let currentUser = { _id: '507f1f77bcf86cd7994390bb', name: 'Regular Admin', role: 'admin', isDemo: false };
  require.cache[authMiddlewarePath].exports = (req, res, next) => {
    req.user = currentUser;
    next();
  };

  const adminRoutes = require('../routes/adminRoutes');
  const app = express();
  app.use(express.json());
  app.use('/api/admin', adminRoutes);
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();

  try {
    const createAttempt = await fetch(`http://127.0.0.1:${port}/api/admin/staff`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(createBody),
    });
    assert.equal(createAttempt.status, 403);

    const updateAttempt = await fetch(`http://127.0.0.1:${port}/api/admin/staff/${existingStaff._id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ designation: 'Professor' }),
    });
    assert.equal(updateAttempt.status, 403);
    console.log('PASS: A non-super-admin receives 403 when creating or updating staff details.');
  } finally {
    await new Promise((resolve) => server.close(resolve));
    require.cache[authMiddlewarePath].exports = originalAuthMiddleware;
  }
};

run()
  .catch((error) => {
    console.error('FAIL: Staff details checks failed:', error);
    process.exitCode = 1;
  })
  .finally(() => {
    User.find = originalMethods.userFind;
    User.findOne = originalMethods.userFindOne;
    User.exists = originalMethods.userExists;
    User.create = originalMethods.userCreate;
    AuditLog.create = originalMethods.auditCreate;
    Availability.distinct = originalMethods.availabilityDistinct;
  });
