const User = require('../models/User');
const LeaveRequest = require('../models/LeaveRequest');
const ODRequest = require('../models/ODRequest');
const BonafideRequest = require('../models/BonafideRequest');
const Complaint = require('../models/Complaint');
const { isDemoUser } = require('../config/demo');
const getRequestStatusCounts = require('../utils/requestStats');

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

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

const getStudentProfile = async (req, res) => {
  const user = await User.findById(req.user._id).select('-password');
  res.status(200).json({ user });
};

const updateStudentProfile = async (req, res) => {
  if (isDemoUser(req.user)) {
    return res.status(403).json({ message: 'Demo accounts cannot change profile or password' });
  }

  const { name, email, phone, department, year, semester } = req.body || {};
  const profile = {
    name: typeof name === 'string' ? name.trim() : '',
    email: typeof email === 'string' ? email.trim().toLowerCase() : '',
    phone: typeof phone === 'string' ? phone.trim() : '',
    department: typeof department === 'string' ? department.trim() : '',
    year: typeof year === 'string' ? year.trim() : '',
    semester: typeof semester === 'string' ? semester.trim() : '',
  };

  if (Object.values(profile).some((value) => !value)) {
    return res.status(400).json({ message: 'Please fill in all profile fields' });
  }

  if (!isValidEmail(profile.email)) {
    return res.status(400).json({ message: 'Please provide a valid email address' });
  }

  const updatedUser = await User.findByIdAndUpdate(
    req.user._id,
    profile,
    { new: true, runValidators: true }
  );

  if (!updatedUser) {
    return res.status(404).json({ message: 'User not found' });
  }

  res.status(200).json({ message: 'Profile updated successfully', user: serializeUser(updatedUser) });
};

const changePassword = async (req, res) => {
  if (isDemoUser(req.user)) {
    return res.status(403).json({ message: 'Demo accounts cannot change profile or password' });
  }

  const { currentPassword, newPassword, confirmPassword } = req.body || {};

  if (!currentPassword || !newPassword || !confirmPassword) {
    return res.status(400).json({ message: 'All password fields are required' });
  }

  if (newPassword !== confirmPassword) {
    return res.status(400).json({ message: 'New passwords do not match' });
  }

  const user = await User.findById(req.user._id);
  const isMatch = await require('bcryptjs').compare(currentPassword, user.password);

  if (!isMatch) {
    return res.status(400).json({ message: 'Current password is incorrect' });
  }

  const salt = await require('bcryptjs').genSalt(10);
  user.password = await require('bcryptjs').hash(newPassword, salt);
  await user.save();

  res.status(200).json({ message: 'Password updated successfully' });
};

const getDashboardData = async (req, res) => {
  const studentId = req.user._id;
  const requestCounts = await getRequestStatusCounts(
    [LeaveRequest, ODRequest, BonafideRequest, Complaint],
    { studentId }
  );

  res.status(200).json({
    ...requestCounts,
    student: {
      name: req.user.name,
      registerNumber: req.user.registerNumber,
      department: req.user.department,
      year: req.user.year,
      semester: req.user.semester,
    },
  });
};

module.exports = {
  getStudentProfile,
  updateStudentProfile,
  changePassword,
  getDashboardData,
};
