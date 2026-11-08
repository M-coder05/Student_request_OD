const Appointment = require('../models/Appointment');
const {
  addDays,
  todayInKolkata,
  weekdayForDate,
} = require('./appointmentTime');

const dateMarker = (date) => date.replace(/-/g, '');

const buildDemoAppointmentPlan = (todayString) => {
  const pendingDates = [];
  let date = addDays(todayString, 1);
  while (pendingDates.length < 2) {
    const weekday = weekdayForDate(date);
    if (weekday >= 1 && weekday <= 5) pendingDates.push(date);
    date = addDays(date, 1);
  }

  return [
    {
      appointmentId: `APT-DEMO-${dateMarker(pendingDates[0])}-1`,
      date: pendingDates[0],
      startTime: '10:00',
      endTime: '10:30',
      purpose: 'Discuss project supervision',
      status: 'Pending',
    },
    {
      appointmentId: `APT-DEMO-${dateMarker(pendingDates[1])}-2`,
      date: pendingDates[1],
      startTime: '11:00',
      endTime: '11:30',
      purpose: 'Review semester study plan',
      status: 'Pending',
    },
    {
      appointmentId: `APT-DEMO-${dateMarker(todayString)}-3`,
      date: todayString,
      startTime: '13:00',
      endTime: '13:30',
      purpose: 'Discuss internship preparation',
      status: 'Approved',
    },
  ];
};

const buildDemoAppointmentDocuments = ({ student, faculty, todayString = todayInKolkata() }) => (
  buildDemoAppointmentPlan(todayString).map((appointment) => ({
    ...appointment,
    studentId: student._id,
    studentName: student.name,
    registerNumber: student.registerNumber,
    department: student.department,
    staffId: faculty._id,
    staffName: faculty.name,
    staffRole: 'faculty',
    isDemo: true,
    statusHistory: [{
      fromStatus: appointment.status === 'Approved' ? 'Pending' : '',
      toStatus: appointment.status,
      actorId: student._id,
      actorName: student.name,
      actorRole: 'student',
      remark: '',
    }],
  }))
);

const ensureFreshDemoAppointments = async ({ student, faculty }) => {
  const today = todayInKolkata();
  const todayMarker = `APT-DEMO-${dateMarker(today)}-`;
  const appointments = await Appointment.find({
    studentId: student._id,
    isDemo: true,
  }).select('appointmentId');
  if (appointments.some((appointment) => appointment.appointmentId.startsWith(todayMarker))) return;

  await Appointment.deleteMany({
    isDemo: true,
    studentId: student._id,
  });
  await Appointment.insertMany(buildDemoAppointmentDocuments({ student, faculty, todayString: today }));
};

module.exports = {
  buildDemoAppointmentDocuments,
  buildDemoAppointmentPlan,
  ensureFreshDemoAppointments,
};
