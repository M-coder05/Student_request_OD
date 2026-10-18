const mongoose = require('mongoose');
const User = require('../models/User');
const LeaveRequest = require('../models/LeaveRequest');
const ODRequest = require('../models/ODRequest');
const BonafideRequest = require('../models/BonafideRequest');
const Complaint = require('../models/Complaint');
const { DEMO_ADMIN_EMAIL, DEMO_STUDENT_EMAIL } = require('../config/demo');

const isDemoAdmin = (user) => user.role === 'admin' && user.isDemo === true;

const getDemoStudent = async (req) => {
  if (!isDemoAdmin(req.user)) {
    return null;
  }

  return User.findOne({ email: DEMO_STUDENT_EMAIL, role: 'student', isDemo: true })
    .select('name registerNumber email department year semester role');
};

const getRequestFilter = (user, demoStudent) => {
  if (!isDemoAdmin(user)) {
    return {};
  }

  return demoStudent ? { studentId: demoStudent._id } : { studentId: { $in: [] } };
};

const getAdminDashboard = async (req, res) => {
  const demoStudent = await getDemoStudent(req);
  const requestFilter = getRequestFilter(req.user, demoStudent);
  const studentFilter = isDemoAdmin(req.user)
    ? (demoStudent ? { _id: demoStudent._id, role: 'student' } : { _id: { $exists: false } })
    : { role: 'student' };
  const [totalStudents, totalLeave, totalOD, totalBonafide, totalComplaints] = await Promise.all([
    User.countDocuments(studentFilter),
    LeaveRequest.countDocuments(requestFilter),
    ODRequest.countDocuments(requestFilter),
    BonafideRequest.countDocuments(requestFilter),
    Complaint.countDocuments(requestFilter),
  ]);

  const totalRequests = totalLeave + totalOD + totalBonafide + totalComplaints;

  const pendingRequests =
    (await LeaveRequest.countDocuments({ ...requestFilter, status: 'Pending' })) +
    (await ODRequest.countDocuments({ ...requestFilter, status: 'Pending' })) +
    (await BonafideRequest.countDocuments({ ...requestFilter, status: 'Pending' })) +
    (await Complaint.countDocuments({ ...requestFilter, status: 'Pending' }));

  const approvedRequests =
    (await LeaveRequest.countDocuments({ ...requestFilter, status: 'Approved' })) +
    (await ODRequest.countDocuments({ ...requestFilter, status: 'Approved' })) +
    (await BonafideRequest.countDocuments({ ...requestFilter, status: 'Approved' }));

  const rejectedRequests =
    (await LeaveRequest.countDocuments({ ...requestFilter, status: 'Rejected' })) +
    (await ODRequest.countDocuments({ ...requestFilter, status: 'Rejected' })) +
    (await BonafideRequest.countDocuments({ ...requestFilter, status: 'Rejected' })) +
    (await Complaint.countDocuments({ ...requestFilter, status: 'Rejected' }));

  const resolvedComplaints = await Complaint.countDocuments({ ...requestFilter, status: 'Resolved' });

  res.status(200).json({
    totalStudents,
    totalRequests,
    pendingRequests,
    approvedRequests,
    rejectedRequests,
    resolvedComplaints,
  });
};

const getAllStudents = async (req, res) => {
  const demoStudent = await getDemoStudent(req);
  if (req.user.email === DEMO_ADMIN_EMAIL) {
    return res.status(200).json({ students: demoStudent ? [demoStudent] : [] });
  }

  const students = await User.find({ role: 'student' }).sort({ createdAt: -1 }).select('-password');
  res.status(200).json({ students });
};

const getAllRequests = async (req, res) => {
  const demoStudent = await getDemoStudent(req);
  const requestFilter = getRequestFilter(req.user, demoStudent);
  const [leaves, ods, bonafides, complaints] = await Promise.all([
    LeaveRequest.find(requestFilter).sort({ createdAt: -1 }),
    ODRequest.find(requestFilter).sort({ createdAt: -1 }),
    BonafideRequest.find(requestFilter).sort({ createdAt: -1 }),
    Complaint.find(requestFilter).sort({ createdAt: -1 }),
  ]);

  const requests = [
    ...leaves.map((request) => ({ ...request.toObject(), type: 'Leave' })),
    ...ods.map((request) => ({ ...request.toObject(), type: 'OD' })),
    ...bonafides.map((request) => ({ ...request.toObject(), type: 'Bonafide' })),
    ...complaints.map((request) => ({ ...request.toObject(), type: 'Complaint' })),
  ].sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );

  res.status(200).json({ requests });
};

const getRequestById = async (req, res) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    return res.status(404).json({ message: 'Request not found' });
  }

  const demoStudent = await getDemoStudent(req);
  const requestFilter = { ...getRequestFilter(req.user, demoStudent), _id: id };

  const models = [
    { model: LeaveRequest, type: 'Leave' },
    { model: ODRequest, type: 'OD' },
    { model: BonafideRequest, type: 'Bonafide' },
    { model: Complaint, type: 'Complaint' },
  ];

  for (const item of models) {
    const request = await item.model.findOne(requestFilter);
    if (request) {
      return res.status(200).json({ request: { ...request.toObject(), type: item.type } });
    }
  }

  res.status(404).json({ message: 'Request not found' });
};

const updateRequestStatus = async (req, res) => {
  const { status, adminRemark } = req.body;
  const { id } = req.params;

  if (!mongoose.isValidObjectId(id)) {
    return res.status(404).json({ message: 'Request not found' });
  }

  const demoStudent = await getDemoStudent(req);
  const requestFilter = { ...getRequestFilter(req.user, demoStudent), _id: id };

  if (!status) {
    return res.status(400).json({ message: 'Status is required' });
  }

  const models = [
    { model: LeaveRequest, type: 'Leave' },
    { model: ODRequest, type: 'OD' },
    { model: BonafideRequest, type: 'Bonafide' },
    { model: Complaint, type: 'Complaint' },
  ];

  for (const item of models) {
    const request = await item.model.findOne(requestFilter);
    if (request) {
      request.status = status;
      request.adminRemark = adminRemark || request.adminRemark || '';
      await request.save();
      return res.status(200).json({ message: 'Request status updated successfully', request });
    }
  }

  res.status(404).json({ message: 'Request not found' });
};

module.exports = {
  getAdminDashboard,
  getAllStudents,
  getAllRequests,
  getRequestById,
  updateRequestStatus,
};
