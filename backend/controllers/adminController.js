const mongoose = require('mongoose');
const User = require('../models/User');
const LeaveRequest = require('../models/LeaveRequest');
const ODRequest = require('../models/ODRequest');
const BonafideRequest = require('../models/BonafideRequest');
const Complaint = require('../models/Complaint');
const AuditLog = require('../models/AuditLog');
const { DEMO_STUDENT_EMAIL } = require('../config/demo');
const getRequestStatusCounts = require('../utils/requestStats');
const notifyUser = require('../utils/notifyUser');
const crypto = require('crypto');

const isDemoAdmin = (user) => user.role === 'demo_admin' && user.isDemo === true;

const getPagination = (query) => {
  const page = Math.max(Number.parseInt(String(query.page || ''), 10) || 1, 1);
  const limit = Math.min(Math.max(Number.parseInt(String(query.limit || ''), 10) || 100, 1), 100);
  return { page, limit, skip: (page - 1) * limit };
};

const getSort = (query, allowedFields) => {
  const requestedField = String(query.sortBy || '');
  const field = allowedFields.includes(requestedField) ? requestedField : 'createdAt';
  return { [field]: String(query.sortOrder || '') === 'asc' ? 1 : -1 };
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
  const [totalStudents, totalUsers, requestCounts, resolvedComplaints] = await Promise.all([
    User.countDocuments(studentFilter),
    User.countDocuments(isDemoAdmin(req.user) ? { isDemo: true } : {}),
    getRequestStatusCounts([LeaveRequest, ODRequest, BonafideRequest, Complaint], requestFilter),
    Complaint.countDocuments({ ...requestFilter, status: 'Resolved' }),
  ]);

  res.status(200).json({
    totalStudents,
    totalUsers,
    ...requestCounts,
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
  const status = req.query.status ? String(req.query.status) : '';
  const type = req.query.type ? String(req.query.type) : '';
  const q = req.query.q ? String(req.query.q) : '';
  const from = req.query.from ? String(req.query.from) : '';
  const to = req.query.to ? String(req.query.to) : '';
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
  ].filter((item) => !type || item.type.toLowerCase() === type.toLowerCase());
  const baseFilter = { ...requestFilter };
  if (status) baseFilter.status = String(status);
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
      if (item.type === 'Bonafide' && previousStatus !== status) {
        const requestOwner = await User.findById(request.studentId).select('isDemo');
        if (status === 'Approved' && requestOwner?.isDemo !== true) {
          request.verificationCode = crypto.randomBytes(32).toString('base64url');
          request.certificateNumber = `BONA-${new Date().getFullYear()}-${crypto.randomBytes(5).toString('hex').toUpperCase()}`;
          request.issuedAt = new Date();
          request.revoked = false;
        } else if (status === 'Approved') {
          request.verificationCode = undefined;
          request.certificateNumber = '';
          request.issuedAt = undefined;
          request.revoked = false;
        } else if (previousStatus === 'Approved') {
          request.revoked = true;
        }
      }
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
        try {
          const student = await User.findById(request.studentId).select('email isDemo');
          if (student) {
            await notifyUser({
              user: student,
              request,
              type: item.type,
              title: 'Request status updated',
              message: `Your ${item.type.toLowerCase()} request ${request.requestId} changed from ${previousStatus} to ${status}.${request.adminRemark ? ` Admin remark: ${request.adminRemark}` : ''}`,
              oldStatus: previousStatus,
              newStatus: status,
            });
          }
        } catch (error) {
          console.error('[notifications] Failed to notify request owner:', error.message);
        }
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
