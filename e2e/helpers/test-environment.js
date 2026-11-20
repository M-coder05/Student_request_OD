const E2E_DATABASE_NAME = 'smartStudentPortal_e2e_test';
const PRODUCTION_DATABASE_NAMES = ['smartStudentPortal'];

const assertSafeMongoUri = (uri) => {
  if (typeof uri !== 'string' || !uri.trim()) {
    throw new Error('E2E_MONGO_URI is required; refusing to run E2E setup.');
  }

  let parsed;
  try {
    parsed = new URL(uri.trim());
  } catch {
    throw new Error('E2E_MONGO_URI must be a valid MongoDB Atlas SRV URI; refusing to run E2E setup.');
  }

  if (parsed.protocol !== 'mongodb+srv:') {
    throw new Error('E2E_MONGO_URI must use the mongodb+srv:// Atlas protocol; refusing to run E2E setup.');
  }
  if (!/^[a-z0-9][a-z0-9-]*(?:\.[a-z0-9][a-z0-9-]*)*\.mongodb\.net$/i.test(parsed.hostname)) {
    throw new Error('E2E_MONGO_URI host must be a MongoDB Atlas *.mongodb.net hostname; refusing to run E2E setup.');
  }

  const decodeCredential = (value) => {
    try {
      return decodeURIComponent(value);
    } catch {
      throw new Error('E2E_MONGO_URI contains malformed encoded credentials; refusing to run E2E setup.');
    }
  };
  const username = decodeCredential(parsed.username);
  const password = decodeCredential(parsed.password);
  if (!username || !password) {
    throw new Error('E2E_MONGO_URI must include both a username and a password; refusing to run E2E setup.');
  }

  const databaseName = parsed.pathname.replace(/^\//, '');
  if (PRODUCTION_DATABASE_NAMES.some((name) => name.toLowerCase() === databaseName.toLowerCase())) {
    throw new Error('E2E_MONGO_URI must not use the production database name; refusing to run E2E setup.');
  }
  if (databaseName !== E2E_DATABASE_NAME) {
    throw new Error(`E2E_MONGO_URI database must be exactly ${E2E_DATABASE_NAME}; refusing to run E2E setup.`);
  }

  const authSource = parsed.searchParams.get('authSource');
  if (authSource && authSource !== 'admin' && authSource !== E2E_DATABASE_NAME) {
    throw new Error('E2E_MONGO_URI authSource must be admin or the dedicated E2E database; refusing to run E2E setup.');
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
