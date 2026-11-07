const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const authMiddleware = require('../middleware/authMiddleware');
const { registerUser } = require('../controllers/authController');
const { updateStudentProfile } = require('../controllers/studentController');
const isValidEmail = require('../utils/isValidEmail');
const safeRequestUrl = require('../utils/safeRequestUrl');

const makeResponse = () => ({
  statusCode: 200,
  body: undefined,
  status(statusCode) {
    this.statusCode = statusCode;
    return this;
  },
  json(body) {
    this.body = body;
    return this;
  },
});

const run = async () => {
  const craftedEmail = `${'a'.repeat(50_000)}@${'b'.repeat(49_994)}.test`;
  assert.equal(craftedEmail.length, 100_000);
  const emailStart = process.hrtime.bigint();
  assert.equal(isValidEmail(craftedEmail), false);
  const emailTimeMs = Number(process.hrtime.bigint() - emailStart) / 1e6;
  assert.ok(emailTimeMs < 10, `100 KB email check took ${emailTimeMs.toFixed(2)} ms`);

  const invalidBody = {
    name: 'Test Student',
    registerNumber: 'EMAIL-TEST',
    email: craftedEmail,
    phone: '0000000000',
    department: 'Testing',
    year: '1',
    semester: '1',
    password: 'valid-password',
    confirmPassword: 'valid-password',
  };
  const registerResponse = makeResponse();
  const registerStart = process.hrtime.bigint();
  await registerUser({ body: invalidBody }, registerResponse);
  const registerTimeMs = Number(process.hrtime.bigint() - registerStart) / 1e6;
  assert.equal(registerResponse.statusCode, 400);
  assert.ok(registerTimeMs < 10, `Registration rejected 100 KB email in ${registerTimeMs.toFixed(2)} ms`);

  const profileResponse = makeResponse();
  const profileStart = process.hrtime.bigint();
  await updateStudentProfile({
    user: { _id: 'student', isDemo: false },
    body: {
      name: 'Test Student',
      email: craftedEmail,
      phone: '0000000000',
      department: 'Testing',
      year: '1',
      semester: '1',
    },
  }, profileResponse);
  const profileTimeMs = Number(process.hrtime.bigint() - profileStart) / 1e6;
  assert.equal(profileResponse.statusCode, 400);
  assert.ok(profileTimeMs < 10, `Profile update rejected 100 KB email in ${profileTimeMs.toFixed(2)} ms`);
  console.log(`PASS: 100 KB emails rejected by registration/profile validation (validator ${emailTimeMs.toFixed(2)} ms; endpoints ${registerTimeMs.toFixed(2)}/${profileTimeMs.toFixed(2)} ms).`);

  assert.equal(safeRequestUrl({ originalUrl: '/reset-password/a-secret-token' }), '/reset-password/[redacted]');
  assert.equal(safeRequestUrl({ originalUrl: '/api/reset?token=a-secret-token&next=ok' }), '/api/reset?token=[redacted]&next=ok');
  assert.equal(safeRequestUrl({ originalUrl: '/api/password-reset?reset_token=a-secret-token' }), '/api/password-reset?reset_token=[redacted]');
  console.log('PASS: Path and query reset tokens are redacted from request URLs.');

  const originalFindById = User.findById;
  const originalConsoleError = console.error;
  const originalJwtSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = 'test-secret';
  let loggedDatabaseFailure = false;
  try {
    User.findById = () => ({
      select: async () => {
        throw new Error('test database failure');
      },
    });
    console.error = (...args) => {
      loggedDatabaseFailure = args.some((value) => String(value).includes('test database failure'));
    };

    const databaseResponse = makeResponse();
    await authMiddleware({
      headers: { authorization: `Bearer ${jwt.sign({ id: 'student' }, process.env.JWT_SECRET)}` },
      method: 'GET',
      baseUrl: '/api/student',
      path: '/profile',
    }, databaseResponse, () => assert.fail('next should not be called after a database error'));
    assert.equal(databaseResponse.statusCode, 500);
    assert.deepEqual(databaseResponse.body, { message: 'An internal server error occurred' });
    assert.equal(loggedDatabaseFailure, true);

    const jwtResponse = makeResponse();
    await authMiddleware({
      headers: { authorization: 'Bearer invalid-token' },
      method: 'GET',
      baseUrl: '/api/student',
      path: '/profile',
    }, jwtResponse, () => assert.fail('next should not be called after a JWT error'));
    assert.equal(jwtResponse.statusCode, 401);
    console.log('PASS: JWT failures return 401; database lookup failures are logged and return a generic 500.');
  } finally {
    User.findById = originalFindById;
    console.error = originalConsoleError;
    if (originalJwtSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = originalJwtSecret;
  }
};

run().catch((error) => {
  console.error('FAIL: Email validation or auth middleware checks failed:', error);
  process.exitCode = 1;
});
