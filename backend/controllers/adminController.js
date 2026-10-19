const mongoose = require('mongoose');
const User = require('../models/User');
const LeaveRequest = require('../models/LeaveRequest');
const ODRequest = require('../models/ODRequest');
const BonafideRequest = require('../models/BonafideRequest');
const Complaint = require('../models/Complaint');
const AuditLog = require('../models/AuditLog');
const { DEMO_STUDENT_EMAIL } = require('../config/demo');

const isDemoAdmin = (user) => user.role === 'demo_admin' && user.isDemo === true;

const getPagination = (query) => {
  const page = Math.max(Number.parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(Number.parseInt(query.limit, 10) || 100, 1), 100);
  return { page, limit, skip: (page - 1) * limit };
};

const getSort = (query, allowedFields) => {
  const field = allowedFields.includes(query.sortBy) ? query.sortBy : 'createdAt';
  return { [field]: query.sortOrder === 'asc' ? 1 : -1 };
};

const recordAdminAction = (req, action, recordType, recordId, details) => AuditLog.create({
  administratorId: req.user._id,
  administratorName: req.user.name,
  administratorRole: req.user.role,
  action,
  recordType,
  recordId,
  details,
  isDemo: isDemoAdmin(req.user),
});

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
  const [totalStudents, totalUsers, totalLeave, totalOD, totalBonafide, totalComplaints] = await Promise.all([
    User.countDocuments(studentFilter),
    User.countDocuments(isDemoAdmin(req.user) ? { isDemo: true } : {}),
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
    totalUsers,
    totalRequests,
    pendingRequests,
    approvedRequests,
    rejectedRequests,
    resolvedComplaints,
  });
};

const getAllStudents = async (req, res) => {
  const demoStudent = await getDemoStudent(req);
  const filter = isDemoAdmin(req.user)
    ? (demoStudent ? { _id: demoStudent._id, role: 'student' } : { _id: { $exists: false } })
    : { role: 'student' };
  const { page, limit, skip } = getPagination(req.query);
  const search = String(req.query.q || '').trim();
  if (search) {
    filter.$or = ['name', 'registerNumber', 'email', 'department'].map((field) => ({
      [field]: { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' },
    }));
  }
  const [students, total] = await Promise.all([
    User.find(filter).sort(getSort(req.query, ['createdAt', 'name', 'email', 'registerNumber', 'department'])).skip(skip).limit(limit).select('-password'),
    User.countDocuments(filter),
  ]);
  res.status(200).json({ students, total, page, pages: Math.ceil(total / limit) });
};

const getAllUsers = async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = isDemoAdmin(req.user)
    ? { isDemo: true, role: { $in: ['student', 'demo_admin'] } }
    : req.user.role === 'super_admin'
      ? {}
      : { role: 'student', isDemo: { $ne: true } };
  const search = String(req.query.q || '').trim();
  if (search) {
    filter.$or = ['name', 'registerNumber', 'email', 'role'].map((field) => ({
      [field]: { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' },
    }));
  }
  const [users, total] = await Promise.all([
    User.find(filter).sort(getSort(req.query, ['createdAt', 'name', 'email', 'registerNumber', 'department', 'role'])).skip(skip).limit(limit).select('-password'),
    User.countDocuments(filter),
  ]);
  res.status(200).json({ users, total, page, pages: Math.ceil(total / limit) });
};

const updateUserAccess = async (req, res) => {
  const { id } = req.params;
  const { isActive } = req.body;
  if (!mongoose.isValidObjectId(id) || typeof isActive !== 'boolean') {
    return res.status(400).json({ message: 'A valid user and account status are required' });
  }

  const filter = isDemoAdmin(req.user)
    ? { _id: id, isDemo: true, role: 'student' }
    : { _id: id, isDemo: { $ne: true } };
  const user = await User.findOne(filter);
  if (!user || user.role === 'super_admin') {
    return res.status(404).json({ message: 'User not found or protected' });
  }
  if (!isDemoAdmin(req.user) && user.role !== 'student' && req.user.role !== 'super_admin') {
    return res.status(403).json({ message: 'Only the Super Admin can manage administrator accounts' });
  }

  const previousState = user.isActive !== false;
  user.isActive = isActive;
  await user.save();
  if (previousState !== isActive) {
    await recordAdminAction(req, isActive ? 'user_enabled' : 'user_disabled', 'User', user._id, `${user.name} (${user.role})`);
  }
  res.status(200).json({ message: `Account ${isActive ? 'enabled' : 'disabled'}`, user: user.toObject({ transform: (doc, value) => { delete value.password; return value; } }) });
};

const getAllRequests = async (req, res) => {
  const demoStudent = await getDemoStudent(req);
  const requestFilter = getRequestFilter(req.user, demoStudent);
  const { page, limit, skip } = getPagination(req.query);
  const { status, type, q, from, to } = req.query;
  const sort = getSort(req.query, ['createdAt', 'studentName', 'status', 'type']);
  const sortField = Object.keys(sort)[0];
  const startDate = from ? new Date(from) : null;
  const endDate = to ? new Date(`${to}T23:59:59.999`) : null;
  if ((startDate && Number.isNaN(startDate.getTime())) || (endDate && Number.isNaN(endDate.getTime()))) {
    return res.status(400).json({ message: 'Invalid date filter' });
  }

  const models = [
    { model: LeaveRequest, type: 'Leave' },
    { model: ODRequest, type: 'OD' },
    { model: BonafideRequest, type: 'Bonafide' },
    { model: Complaint, type: 'Complaint' },
  ].filter((item) => !type || item.type.toLowerCase() === String(type).toLowerCase());
  const baseFilter = { ...requestFilter };
  if (status) baseFilter.status = status;
  if (startDate || endDate) {
    baseFilter.createdAt = {};
    if (startDate) baseFilter.createdAt.$gte = startDate;
    if (endDate) baseFilter.createdAt.$lte = endDate;
  }
  const search = String(q || '').trim();
  if (search) {
    const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    baseFilter.$or = ['requestId', 'studentName', 'registerNumber'].map((field) => ({
      [field]: { $regex: escapedSearch, $options: 'i' },
    }));
  }

  const batches = await Promise.all(models.map(async (item) => {
    const querySort = sortField === 'type' ? { createdAt: -1 } : sort;
    const [records, total] = await Promise.all([
      item.model.find(baseFilter).sort(querySort).limit(skip + limit),
      item.model.countDocuments(baseFilter),
    ]);
    return { type: item.type, records, total };
  }));
  let requests = batches.flatMap(({ type: requestType, records }) => records.map((request) => ({
    ...request.toObject(),
    type: requestType,
  })));
  requests.sort((left, right) => {
    const leftValue = left[sortField];
    const rightValue = right[sortField];
    const comparison = sortField === 'createdAt'
      ? new Date(leftValue) - new Date(rightValue)
      : String(leftValue || '').localeCompare(String(rightValue || ''), undefined, { sensitivity: 'base' });
    return comparison * sort[sortField];
  });
  const total = batches.reduce((count, batch) => count + batch.total, 0);
  res.status(200).json({ requests: requests.slice(skip, skip + limit), total, page, pages: Math.ceil(total / limit) });
};

const getRecentActivity = async (req, res) => {
  const filter = { isDemo: isDemoAdmin(req.user) };
  const activities = await AuditLog.find(filter).sort({ createdAt: -1 }).limit(12);
  res.status(200).json({ activities });
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

  const models = [
    { model: LeaveRequest, type: 'Leave' },
    { model: ODRequest, type: 'OD' },
    { model: BonafideRequest, type: 'Bonafide' },
    { model: Complaint, type: 'Complaint' },
  ];

  for (const item of models) {
    const request = await item.model.findOne(requestFilter);
    if (request) {
      if (!item.model.schema.path('status').enumValues.includes(status)) {
        return res.status(400).json({ message: 'Invalid status for this request type' });
      }

      const previousStatus = request.status;
      request.status = status;
      request.adminRemark = typeof adminRemark === 'string' ? adminRemark.trim().slice(0, 1000) : request.adminRemark;
      if (previousStatus !== status) {
        request.statusHistory.push({
          fromStatus: previousStatus,
          toStatus: status,
          adminId: req.user._id,
          adminName: req.user.name,
          remark: request.adminRemark,
        });
      }
      await request.save();
      if (previousStatus !== status) {
        await recordAdminAction(req, 'request_status_changed', item.type, request._id, `${previousStatus} -> ${status}${request.adminRemark ? `: ${request.adminRemark}` : ''}`);
      }
      return res.status(200).json({ message: 'Request status updated successfully', request });
    }
  }

  res.status(404).json({ message: 'Request not found' });
};

module.exports = {
  getAdminDashboard,
  getAllStudents,
  getAllUsers,
  updateUserAccess,
  getAllRequests,
  getRequestById,
  getRecentActivity,
  updateRequestStatus,
};
