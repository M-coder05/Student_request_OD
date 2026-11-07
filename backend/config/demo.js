const DEMO_STUDENT_EMAIL = 'student.demo@example.com';
const DEMO_ADMIN_EMAIL = 'admin.demo@example.com';
const DEMO_FACULTY_EMAIL = 'faculty.demo@example.com';

const getDemoAccounts = () => ({
  student: {
    email: DEMO_STUDENT_EMAIL,
    password: process.env.DEMO_STUDENT_PASSWORD,
    role: 'student',
  },
  admin: {
    email: DEMO_ADMIN_EMAIL,
    password: process.env.DEMO_ADMIN_PASSWORD,
    role: 'demo_admin',
  },
  faculty: {
    email: DEMO_FACULTY_EMAIL,
    password: process.env.DEMO_FACULTY_PASSWORD || process.env.DEMO_ADMIN_PASSWORD,
    role: 'faculty',
  },
});

const isDemoModeEnabled = () => process.env.DEMO_MODE === 'true';

const hasDemoCredentials = () => {
  const accounts = getDemoAccounts();
  return Boolean(accounts.student.password?.trim() && accounts.admin.password?.trim());
};

const isDemoUser = (user) => Boolean(user && user.isDemo === true);

module.exports = {
  DEMO_STUDENT_EMAIL,
  DEMO_ADMIN_EMAIL,
  DEMO_FACULTY_EMAIL,
  getDemoAccounts,
  hasDemoCredentials,
  isDemoModeEnabled,
  isDemoUser,
};
