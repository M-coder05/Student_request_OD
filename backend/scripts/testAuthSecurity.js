const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { generateToken } = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');
const normalizeLoginIdentifier = require('../utils/loginIdentifier');

const originalJwtSecret = process.env.JWT_SECRET;
const originalJwtExpiresIn = process.env.JWT_EXPIRES_IN;
const originalUserFindById = User.findById;

const makeResponse = () => ({
  statusCode: 200,
  body: null,
  status(code) { this.statusCode = code; return this; },
  json(body) { this.body = body; return this; },
});

const invokeAuthMiddleware = async (token, user) => {
  User.findById = () => ({
    select() { return Promise.resolve(user); },
  });
  const req = {
    headers: { authorization: `Bearer ${token}` },
    method: 'GET',
    baseUrl: '/api/test',
    path: '/',
  };
  const res = makeResponse();
  let nextCalled = false;
  await authMiddleware(req, res, () => { nextCalled = true; });
  return { req, res, nextCalled };
};

const main = async () => {
  process.env.JWT_SECRET = 'test-auth-security-secret';
  process.env.JWT_EXPIRES_IN = '7d';
  const nowSeconds = Math.floor(Date.now() / 1000);
  const user = {
    _id: 'security-test-user',
    role: 'student',
    passwordChangedAt: new Date((nowSeconds - 30 * 24 * 60 * 60) * 1000),
  };

  const token = generateToken(user);
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  assert.ok(Math.abs(decoded.iat - nowSeconds) <= 1);
  assert.ok(Math.abs(decoded.exp - (decoded.iat + 7 * 24 * 60 * 60)) <= 1);
  let result = await invokeAuthMiddleware(token, user);
  assert.equal(result.nextCalled, true);
  console.log('PASS: Token issued after a 30-day-old password change has a current iat, a full seven-day expiry, and passes middleware.');

  const sameSecond = Math.floor(Date.now() / 1000);
  user.passwordChangedAt = new Date(sameSecond * 1000);
  const sameSecondToken = jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
  const sameSecondDecoded = jwt.verify(sameSecondToken, process.env.JWT_SECRET);
  user.passwordChangedAt = new Date(sameSecondDecoded.iat * 1000);
  result = await invokeAuthMiddleware(sameSecondToken, user);
  assert.equal(result.nextCalled, true);
  console.log('PASS: Token issued in the same second as passwordChangedAt is accepted.');

  const olderIat = Math.floor(Date.now() / 1000) - 10;
  user.passwordChangedAt = new Date((olderIat + 10) * 1000);
  const oldToken = jwt.sign(
    { id: user._id, role: user.role, iat: olderIat },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
  result = await invokeAuthMiddleware(oldToken, user);
  assert.equal(result.res.statusCode, 401);
  assert.equal(result.res.body.message, 'Please log in again');
  assert.equal(result.nextCalled, false);
  console.log('PASS: Token issued ten seconds before passwordChangedAt is rejected with the existing 401 message.');

  user.passwordChangedAt = undefined;
  const noPasswordChangeToken = generateToken(user);
  result = await invokeAuthMiddleware(noPasswordChangeToken, user);
  assert.equal(result.nextCalled, true);
  console.log('PASS: User without passwordChangedAt passes middleware.');

  assert.equal(normalizeLoginIdentifier({ email: 'A@B.com' }), 'a@b.com');
  assert.equal(normalizeLoginIdentifier({ email: ' a@b.com ' }), 'a@b.com');
  assert.equal(normalizeLoginIdentifier({ email: 'a@b.com\t' }), 'a@b.com');
  for (const body of [[], {}, 42, null, undefined]) {
    assert.doesNotThrow(() => normalizeLoginIdentifier(body));
    assert.equal(normalizeLoginIdentifier(body), '');
  }
  assert.equal(normalizeLoginIdentifier({ email: 3, registerNumber: ' REG-01 ' }), 'reg-01');
  console.log('PASS: Login identifiers normalize consistently and malformed body values do not throw.');
};

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    User.findById = originalUserFindById;
    if (originalJwtSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = originalJwtSecret;
    if (originalJwtExpiresIn === undefined) delete process.env.JWT_EXPIRES_IN;
    else process.env.JWT_EXPIRES_IN = originalJwtExpiresIn;
  });
