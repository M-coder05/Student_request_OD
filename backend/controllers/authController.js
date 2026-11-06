const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AllowedStudent = require('../models/AllowedStudent');
const {
  getDemoAccounts,
  hasDemoCredentials,
  isDemoModeEnabled,
} = require('../config/demo');

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const generateToken = (user) => {
  const payload = { id: user._id, role: user.role };
  if (user.passwordChangedAt) {
    payload.iat = Math.ceil(user.passwordChangedAt.getTime() / 1000);
  }
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

const serializeUser = (user) => ({
  id: user._id,
  name: user.name,
  registerNumber: user.registerNumber,
  email: user.email,
  department: user.department || user.staffDepartment || '',
  staffDepartment: user.staffDepartment || '',
  year: user.year,
  semester: user.semester,
  role: user.role,
  demo: user.isDemo === true,
  mustChangePassword: user.mustChangePassword === true,
});

const registerUser = async (req, res) => {
  let {
    name,
    registerNumber,
    email,
    phone,
    department,
    year,
    semester,
    password,
    confirmPassword,
  } = req.body || {};

  name = typeof name === 'string' ? name.trim() : '';
  registerNumber = typeof registerNumber === 'string' ? registerNumber.trim() : '';
  email = typeof email === 'string' ? email.trim().toLowerCase() : '';
  phone = typeof phone === 'string' ? phone.trim() : '';
  department = typeof department === 'string' ? department.trim() : '';
  year = typeof year === 'string' ? year.trim() : '';
  semester = typeof semester === 'string' ? semester.trim() : '';

  if (!name || !registerNumber || !email || !phone || !department || !year || !semester || !password || !confirmPassword) {
    return res.status(400).json({ message: 'Please fill in all fields' });
  }

  if (!isValidEmail(email)) {
    return res.status(400).json({ message: 'Please provide a valid email address' });
  }

  if (typeof password !== 'string' || password.length < 8) {
    return res.status(400).json({ message: 'Password must be at least 8 characters long' });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({ message: 'Passwords do not match' });
  }

  if (process.env.ENFORCE_ALLOWLIST === 'true') {
    const allowedStudent = await AllowedStudent.exists({ registerNumber });
    if (!allowedStudent) {
      return res.status(403).json({ message: 'Registration could not be completed' });
    }
  }

  const exists = await User.findOne({
    $or: [{ registerNumber }, { email }],
  });

  if (exists) {
    return res.status(400).json({ message: 'Register number or email already exists' });
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  const user = await User.create({
    name,
    registerNumber,
    email,
    phone,
    department,
    year,
    semester,
    password: hashedPassword,
    role: 'student',
  });

  const token = generateToken(user);

  res.status(201).json({
    message: 'Registration successful',
    token,
    user: serializeUser(user),
  });
};

const loginUser = async (req, res) => {
  const { registerNumber, email, password } = req.body || {};
  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
  const normalizedRegisterNumber = typeof registerNumber === 'string' ? registerNumber.trim() : '';
  const loginPassword = typeof password === 'string' ? password : '';

  if ((!normalizedRegisterNumber && !normalizedEmail) || !loginPassword) {
    return res.status(400).json({ message: 'Register number or email and password are required' });
  }

  const query = normalizedEmail
    ? { email: normalizedEmail }
    : { registerNumber: normalizedRegisterNumber };

  const user = await User.findOne(query);

  if (!user) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const isMatch = await bcrypt.compare(loginPassword, user.password);

  if (!isMatch) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  if (user.isActive === false) {
    console.warn('[auth] Login failed: inactive account');
    return res.status(401).json({ message: 'Inactive account' });
  }

  const token = generateToken(user);

  res.status(200).json({
    message: 'Login successful',
    token,
    user: serializeUser(user),
  });
};

const getDemoAvailability = async (req, res) => {
  if (!isDemoModeEnabled()) {
    return res.status(200).json({ enabled: false, reason: 'disabled', roles: {} });
  }

  if (!hasDemoCredentials()) {
    return res.status(200).json({ enabled: false, reason: 'missing_credentials', roles: {} });
  }

  const accounts = getDemoAccounts();
  const [student, admin] = await Promise.all([
    User.findOne({ email: accounts.student.email, role: 'student', isDemo: true, isActive: { $ne: false } }).select('_id'),
    User.findOne({ email: accounts.admin.email, role: 'demo_admin', isDemo: true, isActive: { $ne: false } }).select('_id'),
  ]);

  res.status(200).json({
    enabled: true,
    roles: {
      student: {
        available: Boolean(student),
        email: student ? accounts.student.email : '',
      },
      admin: {
        available: Boolean(admin),
        email: admin ? accounts.admin.email : '',
      },
    },
  });
};

const loginDemo = async (req, res) => {
  if (!isDemoModeEnabled() || !hasDemoCredentials()) {
    return res.status(404).json({ message: 'Demo access is not enabled in this environment' });
  }

  const { role } = req.body;
  const accounts = getDemoAccounts();
  const account = accounts[role];

  if (!account || !['student', 'admin'].includes(role)) {
    return res.status(400).json({ message: 'Select a valid demo role' });
  }

  const user = await User.findOne({
    email: account.email,
    role: account.role,
    isDemo: true,
    isActive: { $ne: false },
  });

  if (!user || !(await bcrypt.compare(account.password, user.password))) {
    return res.status(503).json({ message: 'Demo account is unavailable. Run npm run seed:demo and try again.' });
  }

  res.status(200).json({
    message: 'Demo login successful',
    token: generateToken(user),
    user: serializeUser(user),
  });
};

const getMe = async (req, res) => {
  res.status(200).json({ user: req.user });
};

module.exports = { registerUser, loginUser, getDemoAvailability, loginDemo, getMe };
