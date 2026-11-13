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
const Availability = require('./models/Availability');
const BlackoutDate = require('./models/BlackoutDate');
const Appointment = require('./models/Appointment');
const Announcement = require('./models/Announcement');
const { buildDemoAppointmentDocuments } = require('./utils/demoAppointments');

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
      { email: { $in: [DEMO_STUDENT_EMAIL, DEMO_ADMIN_EMAIL, 'principal.demo@example.com', 'hod.demo@example.com', 'faculty.demo@example.com'] } },
      { registerNumber: { $in: ['DEMO-CS-024', 'DEMO-ADMIN-01', 'DEMO-PRINCIPAL-01', 'DEMO-HOD-01', 'DEMO-FACULTY-01'] } },
    ],
  }).select('email registerNumber');

  if (accountCollision) {
    throw new Error(`Cannot seed demo account: ${accountCollision.email} / ${accountCollision.registerNumber} is already in use by a non-demo account`);
  }

  const studentPassword = await bcrypt.hash(accounts.student.password, 10);
  const adminPassword = await bcrypt.hash(accounts.admin.password, 10);
  const facultyPassword = await bcrypt.hash(accounts.faculty.password, 10);

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
        isActive: true,
      },
    },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
  );

  const admin = await User.findOneAndUpdate(
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
        role: 'demo_admin',
        isDemo: true,
        isActive: true,
      },
    },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
  );

  const demoStaffSeeds = [
    {
      role: 'principal',
      name: 'Demo Principal',
      registerNumber: 'DEMO-PRINCIPAL-01',
      email: 'principal.demo@example.com',
      staffDepartment: '',
      designation: 'Principal',
      officeLocation: 'Administration Block, Room 1',
      officeHours: 'Mon to Fri, 09:00 to 11:00',
      meetingTopics: 'Administration, approvals',
    },
    {
      role: 'hod',
      name: 'Demo HOD',
      registerNumber: 'DEMO-HOD-01',
      email: 'hod.demo@example.com',
      staffDepartment: student.department,
      designation: 'Head of Department',
      officeLocation: 'Block A, Room 101',
      officeHours: 'Tue and Thu, 14:00 to 16:00',
      meetingTopics: 'Department approvals, academic guidance',
    },
    {
      role: 'faculty',
      name: 'Demo Faculty',
      registerNumber: 'DEMO-FACULTY-01',
      email: 'faculty.demo@example.com',
      staffDepartment: student.department,
      designation: 'Assistant Professor',
      officeLocation: 'Block B, Room 204',
      officeHours: 'Mon to Fri, 10:00 to 12:00',
      meetingTopics: 'Projects, internships, study plans',
    },
  ];
  const demoStaff = await Promise.all(demoStaffSeeds.map((staff) => User.findOneAndUpdate(
    { email: staff.email, isDemo: true },
    {
      $set: {
        ...staff,
        phone: '9000000002',
        department: staff.staffDepartment,
        password: staff.role === 'faculty' ? facultyPassword : admin.password,
        isDemo: true,
        isActive: true,
        mustChangePassword: false,
      },
      $unset: { year: 1, semester: 1 },
    },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
  )));

  await Promise.all([
    LeaveRequest.deleteMany({ studentId: student._id }),
    ODRequest.deleteMany({ studentId: student._id }),
    BonafideRequest.deleteMany({ studentId: student._id }),
    Complaint.deleteMany({ studentId: student._id }),
    Appointment.deleteMany({ studentId: student._id, isDemo: true }),
    Announcement.deleteMany({ isDemo: true }),
    Availability.deleteMany({ staffId: { $in: demoStaff.map((staff) => staff._id) } }),
    BlackoutDate.deleteMany({ staffId: { $in: demoStaff.map((staff) => staff._id) } }),
  ]);

  await Availability.insertMany(demoStaff.flatMap((staff) => [1, 2, 3, 4, 5].map((weekday) => ({
    staffId: staff._id,
    weekday,
    startTime: '09:00',
    endTime: '17:00',
    slotMinutes: 30,
    active: true,
  }))));

  const faculty = demoStaff.find((staff) => staff.role === 'faculty');
  await Appointment.insertMany(buildDemoAppointmentDocuments({ student, faculty }));
  await Announcement.insertMany([
    {
      title: 'Welcome to the demo',
      message: 'Explore the portal using the sample student and staff accounts.',
      audience: 'all',
      pinned: true,
      createdBy: admin._id,
      createdByName: admin.name,
      isDemo: true,
    },
    {
      title: 'Library timings this week',
      message: 'The library is open during its regular weekday hours this week.',
      audience: 'all',
      pinned: false,
      createdBy: admin._id,
      createdByName: admin.name,
      isDemo: true,
    },
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
      {
        studentId: student._id,
        studentName: student.name,
        registerNumber: student.registerNumber,
        department: student.department,
        year: student.year,
        semester: student.semester,
        purpose: 'Bus Pass',
        additionalDetails: 'Approved sample request for the demo certificate preview.',
        status: 'Approved',
        adminRemark: 'Approved for the requested purpose.',
        requestId: 'DEMO-BONA-002',
        createdAt: dateDaysFromNow(-3),
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
