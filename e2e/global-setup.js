const { execFileSync } = require('node:child_process');
const path = require('node:path');
const mongoose = require('mongoose');
const User = require('../backend/models/User');
const Appointment = require('../backend/models/Appointment');
const { addDays, todayInKolkata, weekdayForDate } = require('../backend/utils/appointmentTime');
const { assertSafeMongoUri, getTestEnvironment } = require('./helpers/test-environment');

const root = path.resolve(__dirname, '..');
const isolationEmail = 'e2e-isolation-student@example.test';
const isolationRegisterNumber = 'E2E-ISOLATION-STUDENT';
const isolationAppointmentId = 'APT-E2E-ISOLATION-001';

module.exports = async () => {
  const uri = assertSafeMongoUri(process.env.E2E_MONGO_URI);
  const testEnvironment = getTestEnvironment(process.env.E2E_TEST_JWT_SECRET || require('node:crypto').randomBytes(32).toString('hex'));
  testEnvironment.MONGO_URI = uri;
  process.env.E2E_TEST_JWT_SECRET = testEnvironment.JWT_SECRET;

  execFileSync(process.execPath, ['backend/seedDemo.js'], {
    cwd: root,
    env: { ...process.env, ...testEnvironment },
    stdio: 'inherit',
  });

  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 });
    const [student, faculty] = await Promise.all([
      User.findOne({ email: 'student.demo@example.com', role: 'student', isDemo: true }),
      User.findOne({ email: 'faculty.demo@example.com', role: 'faculty', isDemo: true }),
    ]);
    if (!student || !faculty) {
      throw new Error('E2E fixture setup could not find the seeded demo student and faculty.');
    }

    await Promise.all([
      Appointment.deleteOne({ appointmentId: isolationAppointmentId }),
      User.deleteOne({ email: isolationEmail, isDemo: false }),
      User.deleteOne({ registerNumber: isolationRegisterNumber, isDemo: false }),
    ]);

    const nonDemoStudent = await User.create({
      name: 'E2E Non-demo Student',
      registerNumber: isolationRegisterNumber,
      email: isolationEmail,
      phone: '9000000056',
      department: student.department,
      year: student.year,
      semester: student.semester,
      password: 'e2e-fixture-password-hash',
      role: 'student',
      isDemo: false,
    });

    let date = addDays(todayInKolkata(), 21);
    while (weekdayForDate(date) < 1 || weekdayForDate(date) > 5) {
      date = addDays(date, 1);
    }

    await Appointment.create({
      appointmentId: isolationAppointmentId,
      studentId: nonDemoStudent._id,
      studentName: nonDemoStudent.name,
      registerNumber: nonDemoStudent.registerNumber,
      department: nonDemoStudent.department,
      staffId: faculty._id,
      staffName: faculty.name,
      staffRole: 'faculty',
      date,
      startTime: '15:30',
      endTime: '16:00',
      purpose: 'E2E non-demo isolation fixture',
      status: 'Pending',
      isDemo: false,
      statusHistory: [{
        fromStatus: '',
        toStatus: 'Pending',
        actorId: nonDemoStudent._id,
        actorName: nonDemoStudent.name,
        actorRole: 'student',
        remark: '',
      }],
    });
  } catch (error) {
    await Appointment.deleteOne({ appointmentId: isolationAppointmentId });
    await Promise.all([
      User.deleteOne({ email: isolationEmail, isDemo: false }),
      User.deleteOne({ registerNumber: isolationRegisterNumber, isDemo: false }),
    ]);
    throw error;
  } finally {
    await mongoose.disconnect();
  }
};
