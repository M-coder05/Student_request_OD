const assertSafeMongoUri = (uri) => {
  if (typeof uri !== 'string' || !uri.trim()) {
    throw new Error('E2E_MONGO_URI is required; refusing to run E2E setup.');
  }
  if (/mongodb\.net/i.test(uri)) {
    throw new Error('E2E_MONGO_URI must not point to mongodb.net; refusing to run E2E setup.');
  }

  let parsed;
  try {
    parsed = new URL(uri);
  } catch {
    throw new Error('E2E_MONGO_URI must be a valid MongoDB URI; refusing to run E2E setup.');
  }

  if (!['mongodb:', 'mongodb+srv:'].includes(parsed.protocol)) {
    throw new Error('E2E_MONGO_URI must use the MongoDB protocol; refusing to run E2E setup.');
  }
  if (!/(e2e|test)/i.test(parsed.pathname)) {
    throw new Error('E2E_MONGO_URI database name must contain "e2e" or "test"; refusing to run E2E setup.');
  }

  return uri;
};

const getTestEnvironment = (jwtSecret) => ({
  PORT: '5055',
  NODE_ENV: 'test',
  MONGO_URI: process.env.E2E_MONGO_URI || '',
  JWT_SECRET: jwtSecret,
  DEMO_MODE: 'true',
  DEMO_STUDENT_PASSWORD: 'E2E-student-password-only',
  DEMO_ADMIN_PASSWORD: 'E2E-admin-password-only',
  DEMO_FACULTY_PASSWORD: 'E2E-faculty-password-only',
  SUPER_ADMIN_NAME: 'E2E Test Administrator',
  SUPER_ADMIN_REGISTER_NUMBER: 'E2E-SUPER-ADMIN',
  SUPER_ADMIN_EMAIL: 'e2e-super-admin@example.test',
  SUPER_ADMIN_PASSWORD: 'E2E-super-admin-password-only',
  SUPER_ADMIN_PHONE: '9000000055',
  APPOINTMENTS_ENABLED: 'true',
});

module.exports = { assertSafeMongoUri, getTestEnvironment };
