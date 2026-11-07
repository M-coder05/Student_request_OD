const mongoose = require('mongoose');
const User = require('../backend/models/User');
const Appointment = require('../backend/models/Appointment');
const { assertSafeMongoUri } = require('./helpers/test-environment');

module.exports = async () => {
  const uri = assertSafeMongoUri(process.env.E2E_MONGO_URI);
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 });
  try {
    await Promise.all([
      Appointment.deleteOne({ appointmentId: 'APT-E2E-ISOLATION-001' }),
      User.deleteOne({ email: 'e2e-isolation-student@example.test', isDemo: false }),
      User.deleteOne({ registerNumber: 'E2E-ISOLATION-STUDENT', isDemo: false }),
    ]);
  } finally {
    await mongoose.disconnect();
  }
};
