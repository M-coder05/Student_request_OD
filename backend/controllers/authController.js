const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const PasswordResetRequest = require('../models/PasswordResetRequest');
const AuditLog = require('../models/AuditLog');
const AllowedStudent = require('../models/AllowedStudent');
const sendMail = require('../utils/mailer');
const { ensureFreshDemoAppointments } = require('../utils/demoAppointments');
const {
  getDemoAccounts,
  hasDemoCredentials,
  isDemoModeEnabled,
} = require('../config/demo');
const isValidEmail = require('../utils/isValidEmail');
const { normalizeDepartment } = require('../utils/departments');

const FORGOT_PASSWORD_MESSAGE = 'If an account matches, your request has been recorded';
const RESET_TOKEN_ERROR = 'Invalid or expired reset token';

const recordPasswordResetAction = (actor, requestId, action, details) => AuditLog.create({
  actorId: actor?._id || null,
  actorName: actor?.name || 'Password reset service',
  actorRole: actor?.role || 'system',
  action,
  recordType: 'PasswordResetRequest',
  recordId: requestId,
  details,
  isDemo: false,
});

const generateToken = (user) => {
  const payload = { id: user._id, role: user.role };
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
  designation: user.designation || '',
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
  department = normalizeDepartment(department);
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

  const lockoutApplies = user.isDemo !== true && !['admin', 'super_admin', 'demo_admin'].includes(user.role);
  if (lockoutApplies && user.lockUntil && user.lockUntil > new Date()) {
    return res.status(423).json({ message: 'Too many attempts. Try again later or use Forgot password.' });
  }
  if (lockoutApplies && user.lockUntil && user.lockUntil <= new Date()) {
    await User.updateOne({ _id: user._id }, { $set: { loginAttempts: 0, lockUntil: null } });
    user.loginAttempts = 0;
    user.lockUntil = null;
  }

  const isMatch = await bcrypt.compare(loginPassword, user.password);

  if (!isMatch) {
    if (lockoutApplies && user.isActive !== false) {
      const updatedUser = await User.findOneAndUpdate(
        { _id: user._id },
        [
          { $set: { loginAttempts: { $add: [{ $ifNull: ['$loginAttempts', 0] }, 1] } } },
          {
            $set: {
              lockUntil: {
                $cond: [
                  { $gte: ['$loginAttempts', 5] },
                  { $add: ['$$NOW', 15 * 60 * 1000] },
                  '$lockUntil',
                ],
              },
            },
          },
        ],
        { new: true }
      );
      if (updatedUser?.loginAttempts >= 5) {
        return res.status(423).json({ message: 'Too many attempts. Try again later or use Forgot password.' });
      }
    }
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  if (user.isActive === false) {
    console.warn('[auth] Login failed: inactive account');
    return res.status(401).json({ message: 'Inactive account' });
  }

  if (lockoutApplies && (user.loginAttempts || user.lockUntil)) {
    await User.updateOne({ _id: user._id }, { $set: { loginAttempts: 0, lockUntil: null } });
  }
  const token = generateToken(user);

  res.status(200).json({
    message: 'Login successful',
    token,
    user: serializeUser(user),
  });
};

const forgotPassword = async (req, res) => {
  const rawIdentifier = typeof req.body?.identifier === 'string' ? req.body.identifier.trim() : '';
  if (!rawIdentifier || rawIdentifier.length > 254) {
    return res.status(200).json({ message: FORGOT_PASSWORD_MESSAGE });
  }

  const normalizedIdentifier = rawIdentifier.includes('@') ? rawIdentifier.toLowerCase() : rawIdentifier;
  const user = await User.findOne({
    $or: [
      { registerNumber: normalizedIdentifier },
      { email: normalizedIdentifier },
    ],
    isActive: { $ne: false },
    isDemo: { $ne: true },
  });

  if (!user) {
    return res.status(200).json({ message: FORGOT_PASSWORD_MESSAGE });
  }

  const now = new Date();
  let resetRequest;
  try {
    resetRequest = await PasswordResetRequest.findOneAndUpdate(
      { userId: user._id, status: 'Pending' },
      {
        $setOnInsert: {
          userId: user._id,
          identifierUsed: rawIdentifier,
          status: 'Pending',
          requestedAt: now,
          requestIp: req.ip || '',
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
  } catch (error) {
    if (error.code !== 11000) throw error;
    resetRequest = await PasswordResetRequest.findOne({ userId: user._id, status: 'Pending' });
  }
  if (!resetRequest) {
    return res.status(200).json({ message: FORGOT_PASSWORD_MESSAGE });
  }

  if (process.env.PASSWORD_RESET_EMAIL === 'true' && resetRequest) {
    const token = crypto.randomBytes(32).toString('base64url');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
    await PasswordResetRequest.updateOne(
      { _id: resetRequest._id, status: 'Pending' },
      { $set: { resetTokenHash: tokenHash, resetTokenExpiresAt: expiresAt, resetTokenUsedAt: null } }
    );

    const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/+$/, '');
    const resetUrl = `${frontendUrl}/reset-password#token=${encodeURIComponent(token)}`;
    try {
      await sendMail({
        to: user.email,
        subject: 'Reset your Smart Student Service Portal password',
        text: `Use this link to reset your password. It expires in 30 minutes and can only be used once:\n${resetUrl}`,
        html: `<p>Use this link to reset your Smart Student Service Portal password. It expires in 30 minutes and can only be used once.</p><p><a href="${resetUrl}">Reset password</a></p>`,
        isDemo: false,
        sensitive: true,
      });
    } catch (error) {
      console.error('[auth] Password reset email delivery failed:', error.message);
    }
  }

  await recordPasswordResetAction(
    user,
    resetRequest._id,
    'password_reset_requested',
    `Password reset requested for ${user.name} (${user.registerNumber})`
  );
  return res.status(200).json({ message: FORGOT_PASSWORD_MESSAGE });
};

const resetPassword = async (req, res) => {
  const { token, newPassword } = req.body || {};
  if (typeof token !== 'string' || !token || typeof newPassword !== 'string' || newPassword.length < 8) {
    return res.status(400).json({ message: typeof newPassword === 'string' ? 'Password must be at least 8 characters long' : RESET_TOKEN_ERROR });
  }

  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const resetRequest = await PasswordResetRequest.findOne({
    resetTokenHash: tokenHash,
    status: 'Pending',
    resetTokenExpiresAt: { $gt: new Date() },
    resetTokenUsedAt: null,
  }).select('+resetTokenHash +resetTokenExpiresAt +resetTokenUsedAt');
  if (!resetRequest) {
    return res.status(400).json({ message: RESET_TOKEN_ERROR });
  }

  const user = await User.findOne({ _id: resetRequest.userId, isActive: { $ne: false }, isDemo: { $ne: true } });
  if (!user) {
    return res.status(400).json({ message: RESET_TOKEN_ERROR });
  }
  if (await bcrypt.compare(newPassword, user.password)) {
    return res.status(400).json({ message: 'New password must be different from your current password' });
  }

  const now = new Date();
  const claimedRequest = await PasswordResetRequest.findOneAndUpdate(
    {
      _id: resetRequest._id,
      status: 'Pending',
      resetTokenHash: tokenHash,
      resetTokenExpiresAt: { $gt: now },
      resetTokenUsedAt: null,
    },
    {
      $set: {
        status: 'Completed',
        resetTokenUsedAt: now,
        handledAt: now,
      },
    },
    { new: true }
  );
  if (!claimedRequest) {
    return res.status(400).json({ message: RESET_TOKEN_ERROR });
  }

  user.password = await bcrypt.hash(newPassword, await bcrypt.genSalt(10));
  user.passwordChangedAt = now;
  user.mustChangePassword = false;
  user.loginAttempts = 0;
  user.lockUntil = null;
  await user.save();
  await recordPasswordResetAction(
    user,
    claimedRequest._id,
    'password_reset_completed',
    `Email password reset completed for ${user.name} (${user.registerNumber})`
  );
  return res.status(200).json({ message: 'Password reset successfully' });
};

const getDemoAvailability = async (req, res) => {
  if (!isDemoModeEnabled()) {
    return res.status(200).json({ enabled: false, reason: 'disabled', roles: {} });
  }

  if (!hasDemoCredentials()) {
    return res.status(200).json({ enabled: false, reason: 'missing_credentials', roles: {} });
  }

  const accounts = getDemoAccounts();
  const [student, admin, faculty] = await Promise.all([
    User.findOne({ email: accounts.student.email, role: 'student', isDemo: true, isActive: { $ne: false } }).select('_id'),
    User.findOne({ email: accounts.admin.email, role: 'demo_admin', isDemo: true, isActive: { $ne: false } }).select('_id'),
    User.findOne({ email: accounts.faculty.email, role: 'faculty', isDemo: true, isActive: { $ne: false } }).select('_id'),
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
      faculty: {
        available: Boolean(faculty),
        email: faculty ? accounts.faculty.email : '',
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

  if (!account || !['student', 'admin', 'faculty'].includes(role)) {
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

  if (['student', 'faculty'].includes(user.role)) {
    try {
      const student = user.role === 'student' ? user : await User.findOne({
        email: accounts.student.email,
        role: 'student',
        isDemo: true,
        isActive: { $ne: false },
      });
      const faculty = user.role === 'faculty' ? user : await User.findOne({
        email: accounts.faculty.email,
        role: 'faculty',
        isDemo: true,
        isActive: { $ne: false },
      });
      if (!student || !faculty) throw new Error('Demo student or faculty account not found');
      await ensureFreshDemoAppointments({ student, faculty });
    } catch (error) {
      if (error?.code !== 11000) {
        console.warn('Unable to refresh demo appointments:', error?.message || 'unknown error');
      }
    }
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

module.exports = {
  registerUser,
  loginUser,
  forgotPassword,
  resetPassword,
  getDemoAvailability,
  loginDemo,
  getMe,
  generateToken,
};
