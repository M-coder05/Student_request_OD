const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const {
  getDemoAccounts,
  hasDemoCredentials,
  isDemoModeEnabled,
} = require('../config/demo');

const generateToken = (user) => {
  return jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

const serializeUser = (user) => ({
  id: user._id,
  name: user.name,
  registerNumber: user.registerNumber,
  email: user.email,
  department: user.department,
  year: user.year,
  semester: user.semester,
  role: user.role,
  demo: user.isDemo === true,
});

const registerUser = async (req, res) => {
  const {
    name,
    registerNumber,
    email,
    phone,
    department,
    year,
    semester,
    password,
    confirmPassword,
  } = req.body;

  if (!name || !registerNumber || !email || !phone || !department || !year || !semester || !password || !confirmPassword) {
    return res.status(400).json({ message: 'Please fill in all fields' });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({ message: 'Passwords do not match' });
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
    user: {
      id: user._id,
      name: user.name,
      registerNumber: user.registerNumber,
      email: user.email,
      role: user.role,
      demo: user.isDemo === true,
    },
  });
};

const loginUser = async (req, res) => {
  const { registerNumber, email, password } = req.body;
  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
  const normalizedRegisterNumber = typeof registerNumber === 'string' ? registerNumber.trim() : '';
  const loginPassword = typeof password === 'string' ? password : '';

  if ((!normalizedRegisterNumber && !normalizedEmail) || !loginPassword) {
    return res.status(400).json({ message: 'Register number or email and password are required' });
  }

  const usesEmail = Boolean(normalizedEmail);
  const identifier = usesEmail ? normalizedEmail : normalizedRegisterNumber;
  const query = usesEmail
    ? { email: normalizedEmail }
    : { registerNumber: normalizedRegisterNumber };

  console.info('[auth] Login attempt', {
    method: usesEmail ? 'email' : 'registerNumber',
    identifier,
  });

  const user = await User.findOne(query);

  if (!user) {
    console.warn('[auth] Login failed: user not found', { identifier });
    return res.status(401).json({ message: 'User not found' });
  }

  const isMatch = await bcrypt.compare(loginPassword, user.password);

  if (!isMatch) {
    console.warn('[auth] Login failed: wrong password', { userId: user._id, identifier });
    return res.status(401).json({ message: 'Wrong password' });
  }

  if (user.isActive === false) {
    console.warn('[auth] Login failed: inactive account', { userId: user._id, identifier });
    return res.status(401).json({ message: 'Inactive account' });
  }

  const token = generateToken(user);

  res.status(200).json({
    message: 'Login successful',
    token,
    user: {
      id: user._id,
      name: user.name,
      registerNumber: user.registerNumber,
      email: user.email,
      department: user.department,
      year: user.year,
      semester: user.semester,
      role: user.role,
      demo: user.isDemo === true,
    },
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
