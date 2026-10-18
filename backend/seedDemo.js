require('dotenv').config();
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const {
  DEMO_STUDENT_EMAIL,
  DEMO_ADMIN_EMAIL,
  getDemoAccounts,
  hasDemoCredentials,
  isDemoModeEnabled,
} = require('./config/demo');
const User = require('./models/User');
const LeaveRequest = require('./models/LeaveRequest');
const ODRequest = require('./models/ODRequest');
const BonafideRequest = require('./models/BonafideRequest');
const Complaint = require('./models/Complaint');

const dateDaysFromNow = (days) => new Date(Date.now() + days * 24 * 60 * 60 * 1000);

const seedDemo = async () => {
  if (!isDemoModeEnabled()) {
    throw new Error('Demo seeding is disabled in production or by DEMO_MODE=false');
  }

  if (!hasDemoCredentials()) {
    throw new Error('Set DEMO_STUDENT_PASSWORD and DEMO_ADMIN_PASSWORD before seeding demo accounts');
  }

  const accounts = getDemoAccounts();
  await connectDB();

  const accountCollision = await User.findOne({
    isDemo: { $ne: true },
    $or: [
      { email: { $in: [DEMO_STUDENT_EMAIL, DEMO_ADMIN_EMAIL] } },
      { registerNumber: { $in: ['DEMO-CS-024', 'DEMO-ADMIN-01'] } },
    ],
  }).select('email registerNumber');

  if (accountCollision) {
    throw new Error(`Cannot seed demo account: ${accountCollision.email} / ${accountCollision.registerNumber} is already in use by a non-demo account`);
  }

  const studentPassword = await bcrypt.hash(accounts.student.password, 10);
  const adminPassword = await bcrypt.hash(accounts.admin.password, 10);

  const student = await User.findOneAndUpdate(
    { email: DEMO_STUDENT_EMAIL, isDemo: true },
    {
      $set: {
        name: 'Casey Morgan',
        registerNumber: 'DEMO-CS-024',
        email: DEMO_STUDENT_EMAIL,
        phone: '9000000024',
        department: 'Computer Science',
        year: 'III',
        semester: '5',
        password: studentPassword,
        role: 'student',
        isDemo: true,
      },
    },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
  );

  await User.findOneAndUpdate(
    { email: DEMO_ADMIN_EMAIL, isDemo: true },
    {
      $set: {
        name: 'Demo Administrator',
        registerNumber: 'DEMO-ADMIN-01',
        email: DEMO_ADMIN_EMAIL,
        phone: '9000000001',
        department: 'Administration',
        year: 'N/A',
        semester: 'N/A',
        password: adminPassword,
        role: 'admin',
        isDemo: true,
      },
    },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
  );

  await Promise.all([
    LeaveRequest.deleteMany({ studentId: student._id }),
    ODRequest.deleteMany({ studentId: student._id }),
    BonafideRequest.deleteMany({ studentId: student._id }),
    Complaint.deleteMany({ studentId: student._id }),
  ]);

  await Promise.all([
    LeaveRequest.insertMany([
      {
        studentId: student._id,
        studentName: student.name,
        registerNumber: student.registerNumber,
        department: student.department,
        fromDate: dateDaysFromNow(-12),
        toDate: dateDaysFromNow(-10),
        reason: 'Family commitment outside the city',
        status: 'Approved',
        adminRemark: 'Approved by the department office.',
        requestId: 'DEMO-LEAVE-001',
        createdAt: dateDaysFromNow(-16),
      },
    ]),
    ODRequest.insertMany([
      {
        studentId: student._id,
        studentName: student.name,
        registerNumber: student.registerNumber,
        department: student.department,
        eventName: 'Regional Student Innovation Forum',
        eventDate: dateDaysFromNow(9),
        eventLocation: 'City Convention Centre',
        organizer: 'Computer Science Student Association',
        reason: 'Presenting a student project at the forum',
        status: 'Pending',
        adminRemark: '',
        requestId: 'DEMO-OD-001',
        createdAt: dateDaysFromNow(-1),
      },
    ]),
    BonafideRequest.insertMany([
      {
        studentId: student._id,
        studentName: student.name,
        registerNumber: student.registerNumber,
        department: student.department,
        year: student.year,
        semester: student.semester,
        purpose: 'Internship',
        additionalDetails: 'Certificate requested for a summer internship application.',
        status: 'Rejected',
        adminRemark: 'Please confirm the organization name and resubmit.',
        requestId: 'DEMO-BONA-001',
        createdAt: dateDaysFromNow(-6),
      },
    ]),
    Complaint.insertMany([
      {
        studentId: student._id,
        studentName: student.name,
        registerNumber: student.registerNumber,
        department: student.department,
        category: 'Laboratory',
        subject: 'Workstation availability in the computing lab',
        description: 'Several workstations in the second floor lab are unavailable during scheduled project hours.',
        status: 'Pending',
        adminRemark: '',
        requestId: 'DEMO-COMP-001',
        createdAt: dateDaysFromNow(-2),
      },
    ]),
  ]);

  console.log('Demo student, admin, and sample requests seeded. Re-running resets demo-student requests only.');
};

seedDemo()
  .then(() => mongoose.disconnect())
  .catch(async (error) => {
    console.error(error.message);
    await mongoose.disconnect();
    process.exitCode = 1;
  });
