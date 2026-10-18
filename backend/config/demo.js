const DEMO_STUDENT_EMAIL = 'student.demo@example.com';
const DEMO_ADMIN_EMAIL = 'admin.demo@example.com';

const getDemoAccounts = () => ({
  student: {
    email: DEMO_STUDENT_EMAIL,
    password: process.env.DEMO_STUDENT_PASSWORD,
    role: 'student',
  },
  admin: {
    email: DEMO_ADMIN_EMAIL,
    password: process.env.DEMO_ADMIN_PASSWORD,
    role: 'admin',
  },
});

const isDemoModeEnabled = () => (
  process.env.NODE_ENV !== 'production' && process.env.DEMO_MODE === 'true'
);

const hasDemoCredentials = () => {
  const accounts = getDemoAccounts();
  return Boolean(accounts.student.password && accounts.admin.password);
};

const isDemoUser = (user) => Boolean(user && user.isDemo === true);

module.exports = {
  DEMO_STUDENT_EMAIL,
  DEMO_ADMIN_EMAIL,
  getDemoAccounts,
  hasDemoCredentials,
  isDemoModeEnabled,
  isDemoUser,
};
