const User = require('../models/User');
const LeaveRequest = require('../models/LeaveRequest');
const ODRequest = require('../models/ODRequest');
const BonafideRequest = require('../models/BonafideRequest');
const Complaint = require('../models/Complaint');

const getStudentProfile = async (req, res) => {
  const user = await User.findById(req.user._id).select('-password');
  res.status(200).json({ user });
};

const updateStudentProfile = async (req, res) => {
  const { name, email, phone, department, year, semester } = req.body;

  const updatedUser = await User.findByIdAndUpdate(
    req.user._id,
    { name, email, phone, department, year, semester },
    { new: true }
  ).select('-password');

  res.status(200).json({ message: 'Profile updated successfully', user: updatedUser });
};

const changePassword = async (req, res) => {
  const { currentPassword, newPassword, confirmPassword } = req.body;

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

  const leaveCount = await LeaveRequest.countDocuments({ studentId });
  const odCount = await ODRequest.countDocuments({ studentId });
  const bonafideCount = await BonafideRequest.countDocuments({ studentId });
  const complaintCount = await Complaint.countDocuments({ studentId });

  const totalRequests = leaveCount + odCount + bonafideCount + complaintCount;
  const pendingRequests = await LeaveRequest.countDocuments({ studentId, status: 'Pending' })
    + await ODRequest.countDocuments({ studentId, status: 'Pending' })
    + await BonafideRequest.countDocuments({ studentId, status: 'Pending' })
    + await Complaint.countDocuments({ studentId, status: 'Pending' });

  const approvedRequests = await LeaveRequest.countDocuments({ studentId, status: 'Approved' })
    + await ODRequest.countDocuments({ studentId, status: 'Approved' })
    + await BonafideRequest.countDocuments({ studentId, status: 'Approved' })
    + await Complaint.countDocuments({ studentId, status: 'Resolved' });

  const rejectedRequests = await LeaveRequest.countDocuments({ studentId, status: 'Rejected' })
    + await ODRequest.countDocuments({ studentId, status: 'Rejected' })
    + await BonafideRequest.countDocuments({ studentId, status: 'Rejected' })
    + await Complaint.countDocuments({ studentId, status: 'Rejected' });

  res.status(200).json({
    totalRequests,
    pendingRequests,
    approvedRequests,
    rejectedRequests,
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
