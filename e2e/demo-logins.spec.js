const { execFileSync } = require('node:child_process');
const path = require('node:path');
const mongoose = require('mongoose');
const { test, expect } = require('@playwright/test');
const Appointment = require('../backend/models/Appointment');
const { todayInKolkata } = require('../backend/utils/appointmentTime');
const { assertSafeMongoUri, getTestEnvironment } = require('./helpers/test-environment');

const root = path.resolve(__dirname, '..');

const loginAsFaculty = async (page) => {
  await page.goto('/login');
  await page.getByRole('button', { name: 'Login as Faculty Demo' }).click();
  await expect(page).toHaveURL(/\/appointments\/requests$/);
  await expect(page.getByRole('status').filter({ hasText: 'DEMO MODE' })).toBeVisible();
};

const apiRequestAsLoggedInUser = async (page, url, method, body) => page.evaluate(async ({ url: requestUrl, method: requestMethod, body: requestBody }) => {
  const token = localStorage.getItem('token');
  const response = await fetch(requestUrl, {
    method: requestMethod,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(requestBody ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(requestBody ? { body: JSON.stringify(requestBody) } : {}),
  });
  return {
    status: response.status,
    body: await response.json(),
  };
}, { url, method, body });

const reseedDemo = () => {
  const uri = assertSafeMongoUri(process.env.E2E_MONGO_URI);
  const environment = getTestEnvironment(process.env.E2E_TEST_JWT_SECRET);
  environment.MONGO_URI = uri;
  execFileSync(process.execPath, ['backend/seedDemo.js'], {
    cwd: root,
    env: { ...process.env, ...environment },
    stdio: 'inherit',
  });
};

const moveAppointmentToToday = async (appointmentId) => {
  const uri = assertSafeMongoUri(process.env.E2E_MONGO_URI);
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 });
  try {
    const result = await Appointment.updateOne(
      { appointmentId, isDemo: true },
      { $set: { date: todayInKolkata() } }
    );
    expect(result.matchedCount).toBe(1);
  } finally {
    await mongoose.disconnect();
  }
};

test('login page shows enabled Student, Admin, and Faculty demo cards', async ({ page }) => {
  await page.goto('/login');
  for (const role of ['Student', 'Admin', 'Faculty']) {
    await expect(page.getByText(`${role} demo`, { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: `Login as ${role} Demo` })).toBeEnabled();
  }
});

test('admin login page shows only the Admin demo card', async ({ page }) => {
  await page.goto('/admin-login');
  await expect(page.getByText('Admin demo', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Login as Admin Demo' })).toBeEnabled();
  await expect(page.getByText('Student demo', { exact: true })).toHaveCount(0);
  await expect(page.getByText('Faculty demo', { exact: true })).toHaveCount(0);
});

test('Student demo logs in to the dashboard with the DEMO banner', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('button', { name: 'Login as Student Demo' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole('status').filter({ hasText: 'DEMO MODE' })).toBeVisible();
});

test('Admin demo logs in to the admin panel with the DEMO banner', async ({ page }) => {
  await page.goto('/admin-login');
  await page.getByRole('button', { name: 'Login as Admin Demo' }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByRole('status').filter({ hasText: 'DEMO MODE' })).toBeVisible();
});

test('Faculty demo logs in as the seeded faculty and sees three seeded appointments', async ({ page }) => {
  await loginAsFaculty(page);
  const user = await page.evaluate(() => JSON.parse(localStorage.getItem('user')));
  expect(user.email).toBe('faculty.demo@example.com');
  expect(user.role).toBe('faculty');
  expect(user.demo).toBe(true);

  for (const purpose of [
    'Discuss project supervision',
    'Review semester study plan',
    'Discuss internship preparation',
  ]) {
    await expect(page.getByRole('row').filter({ hasText: purpose })).toBeVisible();
  }
  await expect(page.locator('.table-wrap tbody tr')).toHaveCount(3);
});

test('Faculty can approve, reject, and complete demo appointments with visible status updates', async ({ page }) => {
  await loginAsFaculty(page);
  const approvedRow = page.getByRole('row').filter({ hasText: 'Discuss project supervision' });
  const rejectedRow = page.getByRole('row').filter({ hasText: 'Review semester study plan' });

  page.once('dialog', (dialog) => dialog.accept('E2E approval'));
  await approvedRow.getByRole('button', { name: 'Approve' }).click();
  await expect(approvedRow).toContainText('Approved');

  page.once('dialog', (dialog) => dialog.accept('E2E rejection'));
  await rejectedRow.getByRole('button', { name: 'Reject' }).click();
  await expect(rejectedRow).toContainText('Rejected');

  await moveAppointmentToToday('APT-DEMO-001');
  await page.goto('/appointments/today');
  const todayRow = page.getByRole('row').filter({ hasText: 'Discuss project supervision' });
  await expect(todayRow).toContainText('Approved');
  page.once('dialog', (dialog) => dialog.accept(''));
  await todayRow.getByRole('button', { name: 'Complete' }).click();
  await expect(todayRow).toContainText('Completed');
});

test('Faculty is restricted from admin/profile/password routes and receives only demo appointments', async ({ page }) => {
  await loginAsFaculty(page);
  await page.goto('/admin');
  await expect(page).not.toHaveURL(/\/admin$/);

  const profile = await apiRequestAsLoggedInUser(page, '/api/student/profile', 'PUT', {});
  const password = await apiRequestAsLoggedInUser(page, '/api/student/change-password', 'PUT', {});
  expect(profile.status).toBe(403);
  expect(password.status).toBe(403);

  const queue = await apiRequestAsLoggedInUser(page, '/api/appointments/staff-queue', 'GET');
  expect(queue.status).toBe(200);
  expect(queue.body.appointments.length).toBeGreaterThan(0);
  expect(queue.body.appointments.every((appointment) => appointment.isDemo === true)).toBe(true);
});

test('Faculty demo queue excludes an appointment for a non-demo student', async ({ page }) => {
  await loginAsFaculty(page);
  const queue = await apiRequestAsLoggedInUser(page, '/api/appointments/staff-queue', 'GET');
  expect(queue.status).toBe(200);
  expect(queue.body.appointments.some((appointment) => (
    appointment.appointmentId === 'APT-E2E-ISOLATION-001'
  ))).toBe(false);
  expect(queue.body.appointments.every((appointment) => appointment.isDemo === true)).toBe(true);
});

test('re-seeding restores the three faculty demo appointment statuses', async ({ page }) => {
  await loginAsFaculty(page);
  reseedDemo();
  await page.goto('/appointments/requests');

  const expectedStatuses = [
    ['Discuss project supervision', 'Pending'],
    ['Review semester study plan', 'Pending'],
    ['Discuss internship preparation', 'Approved'],
  ];
  for (const [purpose, status] of expectedStatuses) {
    await expect(page.getByRole('row').filter({ hasText: purpose })).toContainText(status);
  }
});
