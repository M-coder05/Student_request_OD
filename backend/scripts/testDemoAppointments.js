const assert = require('node:assert/strict');
const { addDays, weekdayForDate } = require('../utils/appointmentTime');
const { buildDemoAppointmentPlan } = require('../utils/demoAppointments');

const nextWeekdays = (today, count) => {
  const dates = [];
  let date = addDays(today, 1);
  while (dates.length < count) {
    const weekday = weekdayForDate(date);
    if (weekday >= 1 && weekday <= 5) dates.push(date);
    date = addDays(date, 1);
  }
  return dates;
};

const verifyDatePlan = (today) => {
  const plan = buildDemoAppointmentPlan(today);
  assert.equal(plan[2].date, today, `Approved appointment should be dated ${today}`);
  assert.deepEqual(plan.slice(0, 2).map((appointment) => appointment.date), nextWeekdays(today, 2));
  return plan;
};

const verifyAppointmentFields = (plan) => {
  assert.deepEqual(plan.map(({ startTime, endTime, status }) => ({ startTime, endTime, status })), [
    { startTime: '10:00', endTime: '10:30', status: 'Pending' },
    { startTime: '11:00', endTime: '11:30', status: 'Pending' },
    { startTime: '13:00', endTime: '13:30', status: 'Approved' },
  ]);
  assert.deepEqual(plan.map((appointment) => appointment.purpose), [
    'Discuss project supervision',
    'Review semester study plan',
    'Discuss internship preparation',
  ]);
};

const main = () => {
  const saturday = verifyDatePlan('2026-11-07');
  verifyDatePlan('2026-11-08');
  verifyDatePlan('2026-11-06');
  verifyDatePlan('2026-01-30');
  verifyDatePlan('2026-12-31');
  console.log('PASS: Approved dates are today; pending dates are the next two weekdays for Saturday, Sunday, Friday, month rollover, and year rollover.');

  const ids = saturday.map((appointment) => appointment.appointmentId);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(ids.every((id) => /^APT-/.test(id)));
  assert.ok(ids.every((id) => id.includes(appointmentDateMarker(appointmentDateFromId(id)))));
  console.log('PASS: Appointment IDs are unique, begin with APT-, and include their appointment dates.');

  verifyAppointmentFields(saturday);
  console.log('PASS: Seeded appointment times, statuses, and purposes are unchanged.');
};

const appointmentDateFromId = (id) => {
  const match = id.match(/^APT-DEMO-(\d{8})-\d+$/);
  assert.ok(match, `Expected a date-bearing demo appointment ID: ${id}`);
  return `${match[1].slice(0, 4)}-${match[1].slice(4, 6)}-${match[1].slice(6, 8)}`;
};

const appointmentDateMarker = (date) => date.replace(/-/g, '');

main();
