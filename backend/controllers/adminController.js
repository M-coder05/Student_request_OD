const mongoose = require('mongoose');
const User = require('../models/User');
const LeaveRequest = require('../models/LeaveRequest');
const ODRequest = require('../models/ODRequest');
const BonafideRequest = require('../models/BonafideRequest');
const Complaint = require('../models/Complaint');
const AuditLog = require('../models/AuditLog');
const PasswordResetRequest = require('../models/PasswordResetRequest');
const { DEMO_STUDENT_EMAIL } = require('../config/demo');
const getRequestStatusCounts = require('../utils/requestStats');
const notifyUser = require('../utils/notifyUser');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const generateTemporaryPassword = require('../utils/generateTemporaryPassword');
const isValidEmail = require('../utils/isValidEmail');

const isDemoAdmin = (user) => user.role === 'demo_admin' && user.isDemo === true;
const STAFF_ROLES = ['faculty', 'hod', 'principal'];
const isDuplicateKey = (error) => error?.code === 11000;
const validateStaffFields = (fields, { partial = false } = {}) => {
  const clean = {};
  const stringFields = ['name', 'employeeId', 'phone', 'role'];
  for (const field of stringFields) {
    if (fields[field] === undefined && partial) continue;
    if (typeof fields[field] !== 'string') return { error: `${field} is required` };
    clean[field] = fields[field].trim();
  }
  if (fields.staffDepartment !== undefined) {
    if (typeof fields.staffDepartment !== 'string') return { error: 'staffDepartment must be a string' };
    clean.staffDepartment = fields.staffDepartment.trim();
  } else if (!partial && fields.role !== 'principal') {
    return { error: 'staffDepartment is required for faculty and HOD accounts' };
  }
  if (!partial) {
    if (typeof fields.email !== 'string') return { error: 'email is required' };
    clean.email = fields.email.trim().toLowerCase();
  }

  if (clean.name !== undefined && (clean.name.length < 2 || clean.name.length > 100)) {
    return { error: 'Name must be between 2 and 100 characters' };
  }
  if (clean.employeeId !== undefined && (clean.employeeId.length < 1 || clean.employeeId.length > 50)) {
    return { error: 'Employee ID must be between 1 and 50 characters' };
  }
  if (clean.phone !== undefined && (clean.phone.length < 5 || clean.phone.length > 30)) {
    return { error: 'A valid phone number is required' };
  }
  if (clean.role !== undefined && !STAFF_ROLES.includes(clean.role)) {
    return { error: 'Role must be faculty, hod or principal' };
  }
  if (
    clean.staffDepartment !== undefined &&
    clean.staffDepartment.length > 100
  ) {
    return { error: 'Department must be at most 100 characters' };
  }
  const role = clean.role || fields.currentRole;
  const department = clean.staffDepartment;
  if (
    (!partial || department !== undefined || clean.role !== undefined) &&
    role !== 'principal' &&
    !(department || fields.currentDepartment)
  ) {
    return { error: 'Department is required for faculty and HOD accounts' };
  }
  if (!partial && (!clean.email || !isValidEmail(clean.email))) {
    return { error: 'Please provide a valid email address' };
  }
  return { clean };
};

const publicStaffAccount = (staff) => ({
  _id: staff._id,
  name: staff.name,
  email: staff.email,
  registerNumber: staff.registerNumber,
  employeeId: staff.registerNumber,
  phone: staff.phone,
  role: staff.role,
  department: staff.staffDepartment || staff.department || '',
  staffDepartment: staff.staffDepartment || '',
  isActive: staff.isActive !== false,
  mustChangePassword: staff.mustChangePassword === true,
  createdAt: staff.createdAt,
  updatedAt: staff.updatedAt,
});

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
  actorId: req.user._id,
  actorName: req.user.name,
  actorRole: req.user.role,
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
  const resetUserRoles = req.user.role === 'super_admin'
    ? ['student', ...STAFF_ROLES]
    : req.user.role === 'admin'
      ? ['student']
      : [];
  const [totalStudents, totalUsers, requestCounts, resolvedComplaints, pendingPasswordResets] = await Promise.all([
    User.countDocuments(studentFilter),
    User.countDocuments(isDemoAdmin(req.user) ? { isDemo: true } : {}),
    getRequestStatusCounts([LeaveRequest, ODRequest, BonafideRequest, Complaint], requestFilter),
    Complaint.countDocuments({ ...requestFilter, status: 'Resolved' }),
    resetUserRoles.length
      ? PasswordResetRequest.countDocuments({
        status: 'Pending',
        userId: {
          $in: await User.find({ role: { $in: resetUserRoles }, isDemo: { $ne: true } }).distinct('_id'),
        },
      })
      : 0,
  ]);

  res.status(200).json({
    totalStudents,
    totalUsers,
    ...requestCounts,
    resolvedComplaints,
    pendingPasswordResets,
  });
};

const getPasswordResetRequests = async (req, res) => {
  if (!['admin', 'super_admin'].includes(req.user.role) || req.user.isDemo === true) {
    return res.status(403).json({ message: 'Administrator access required' });
  }

  const { page, limit, skip } = getPagination(req.query);
  const roles = req.user.role === 'super_admin'
    ? ['student', ...STAFF_ROLES, 'admin', 'super_admin']
    : ['student'];
  const search = String(req.query.q || '').trim();
  const userMatch = { role: { $in: roles }, isDemo: { $ne: true } };
  if (search) {
    const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    userMatch.$or = [
      { name: { $regex: escapedSearch, $options: 'i' } },
      { registerNumber: { $regex: escapedSearch, $options: 'i' } },
    ];
  }

  const userIds = await User.find(userMatch).distinct('_id');
  if (!userIds.length) {
    return res.status(200).json({ requests: [], total: 0, page, pages: 1 });
  }

  const [result] = await PasswordResetRequest.aggregate([
    { $match: { userId: { $in: userIds } } },
    { $addFields: { pendingOrder: { $cond: [{ $eq: ['$status', 'Pending'] }, 0, 1] } } },
    { $sort: { pendingOrder: 1, requestedAt: -1 } },
    {
      $facet: {
        requests: [
          { $skip: skip },
          { $limit: limit },
          {
            $lookup: {
              from: User.collection.name,
              localField: 'userId',
              foreignField: '_id',
              as: 'user',
            },
          },
          { $unwind: '$user' },
          {
            $project: {
              userId: 1,
              identifierUsed: 1,
              status: 1,
              requestedAt: 1,
              handledAt: 1,
              handledBy: 1,
              'user.name': 1,
              'user.registerNumber': 1,
              'user.role': 1,
            },
          },
        ],
        total: [{ $count: 'value' }],
      },
    },
  ]);
  const total = result.total[0]?.value || 0;
  return res.status(200).json({
    requests: result.requests,
    total,
    page,
    pages: Math.max(Math.ceil(total / limit), 1),
  });
};

const issuePasswordResetRequest = async (req, res) => {
  if (!['admin', 'super_admin'].includes(req.user.role) || req.user.isDemo === true) {
    return res.status(403).json({ message: 'Administrator access required' });
  }
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: 'A valid password reset request ID is required' });
  }

  const passwordResetRequest = await PasswordResetRequest.findOne({
    _id: req.params.id,
    status: 'Pending',
  });
  if (!passwordResetRequest) {
    return res.status(404).json({ message: 'Pending password reset request not found' });
  }
  const user = await User.findOne({
    _id: passwordResetRequest.userId,
    isActive: { $ne: false },
    isDemo: { $ne: true },
  });
  if (!user) {
    return res.status(404).json({ message: 'Active account not found' });
  }
  if (req.user.role !== 'super_admin' && user.role !== 'student') {
    return res.status(404).json({ message: 'Pending password reset request not found' });
  }
  if (!['student', ...STAFF_ROLES, 'admin', 'super_admin'].includes(user.role)) {
    return res.status(403).json({ message: 'This account cannot be reset through the admin workflow' });
  }
  if (req.body?.identityVerified !== true) {
    await recordAdminAction(
      req,
      'password_reset_issue_rejected',
      'PasswordResetRequest',
      passwordResetRequest._id,
      `Temporary password issue blocked because identity was not verified for ${user.name} (${user.registerNumber})`
    );
    return res.status(400).json({ message: 'Identity verification is required' });
  }

  const handledAt = new Date();
  const claimedRequest = await PasswordResetRequest.findOneAndUpdate(
    { _id: passwordResetRequest._id, status: 'Pending' },
    {
      $set: { status: 'Issued', handledBy: req.user._id, handledAt },
      $unset: { resetTokenHash: 1, resetTokenExpiresAt: 1, resetTokenUsedAt: 1 },
    },
    { new: true }
  );
  if (!claimedRequest) {
    return res.status(409).json({ message: 'Password reset request has already been handled' });
  }

  const temporaryPassword = generateTemporaryPassword();
  user.password = await bcrypt.hash(temporaryPassword, 10);
  user.passwordChangedAt = handledAt;
  user.mustChangePassword = true;
  user.loginAttempts = 0;
  user.lockUntil = null;
  await user.save();
  await recordAdminAction(
    req,
    'password_reset_issued',
    'PasswordResetRequest',
    claimedRequest._id,
    `Temporary password issued for ${user.name} (${user.registerNumber}) after identity verification`
  );
  return res.status(200).json({ message: 'Temporary password issued', temporaryPassword });
};

const dismissPasswordResetRequest = async (req, res) => {
  if (!['admin', 'super_admin'].includes(req.user.role) || req.user.isDemo === true) {
    return res.status(403).json({ message: 'Administrator access required' });
  }
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: 'A valid password reset request ID is required' });
  }
  const passwordResetRequest = await PasswordResetRequest.findOne({
    _id: req.params.id,
    status: 'Pending',
  });
  if (!passwordResetRequest) {
    return res.status(404).json({ message: 'Pending password reset request not found' });
  }
  const user = await User.findById(passwordResetRequest.userId).select('name registerNumber role');
  if (!user || (req.user.role !== 'super_admin' && user.role !== 'student')) {
    return res.status(404).json({ message: 'Pending password reset request not found' });
  }

  const handledAt = new Date();
  const dismissedRequest = await PasswordResetRequest.findOneAndUpdate(
    { _id: passwordResetRequest._id, status: 'Pending' },
    {
      $set: { status: 'Dismissed', handledBy: req.user._id, handledAt },
      $unset: { resetTokenHash: 1, resetTokenExpiresAt: 1, resetTokenUsedAt: 1 },
    },
    { new: true }
  );
  if (!dismissedRequest) {
    return res.status(409).json({ message: 'Password reset request has already been handled' });
  }
  await recordAdminAction(
    req,
    'password_reset_dismissed',
    'PasswordResetRequest',
    dismissedRequest._id,
    `Password reset request dismissed for ${user.name} (${user.registerNumber})`
  );
  return res.status(200).json({ message: 'Password reset request dismissed' });
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
    ? { isDemo: true, role: { $in: ['student', 'faculty', 'hod', 'principal', 'demo_admin'] } }
    : req.user.role === 'super_admin'
      ? {}
      : { role: { $in: ['student', 'faculty', 'hod', 'principal'] }, isDemo: { $ne: true } };
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
    ? { _id: id, isDemo: true, role: { $in: ['student', 'faculty', 'hod', 'principal'] } }
    : { _id: id, isDemo: { $ne: true } };
  const user = await User.findOne(filter);
  if (!user || user.role === 'super_admin') {
    return res.status(404).json({ message: 'User not found or protected' });
  }
  if (
    !isDemoAdmin(req.user) &&
    !['student', 'faculty', 'hod', 'principal'].includes(user.role) &&
    req.user.role !== 'super_admin'
  ) {
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

const createStaffAccount = async (req, res) => {
  const { clean, error } = validateStaffFields(req.body || {});
  if (error) return res.status(400).json({ message: error });

  const duplicate = await User.exists({
    $or: [
      { email: clean.email },
      { registerNumber: clean.employeeId },
    ],
  });
  if (duplicate) return res.status(409).json({ message: 'Email or employee ID already exists' });

  const temporaryPassword = generateTemporaryPassword();
  const password = await bcrypt.hash(temporaryPassword, 10);
  let staff;
  try {
    staff = await User.create({
      name: clean.name,
      registerNumber: clean.employeeId,
      email: clean.email,
      phone: clean.phone,
      department: clean.staffDepartment || '',
      staffDepartment: clean.staffDepartment || '',
      password,
      role: clean.role,
      mustChangePassword: true,
      createdBy: req.user._id,
      isDemo: false,
      isActive: true,
    });
  } catch (createError) {
    if (isDuplicateKey(createError)) {
      return res.status(409).json({ message: 'Email or employee ID already exists' });
    }
    throw createError;
  }

  await recordAdminAction(
    req,
    'staff_created',
    'User',
    staff._id,
    `${staff.name} (${staff.role}, employee ID ${staff.registerNumber})`
  );
  return res.status(201).json({
    message: 'Staff account created',
    staff: publicStaffAccount(staff),
    temporaryPassword,
  });
};

const getStaffAccounts = async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = { role: { $in: STAFF_ROLES }, isDemo: { $ne: true } };
  const role = String(req.query.role || '');
  if (role) {
    if (!STAFF_ROLES.includes(role)) return res.status(400).json({ message: 'Invalid staff role filter' });
    filter.role = role;
  }
  const status = String(req.query.active ?? req.query.status ?? '');
  if (status === 'true' || status === 'active') filter.isActive = { $ne: false };
  else if (status === 'false' || status === 'disabled') filter.isActive = false;
  else if (status) return res.status(400).json({ message: 'Active status filter must be true or false' });

  const search = String(req.query.q || '').trim();
  if (search) {
    const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.$or = ['name', 'email', 'registerNumber'].map((field) => ({
      [field]: { $regex: escapedSearch, $options: 'i' },
    }));
  }
  const department = String(req.query.department || '').trim();
  if (department) {
    const departmentPattern = new RegExp(
      department.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
      'i'
    );
    filter.$and = [{
      $or: [
        { staffDepartment: departmentPattern },
        { staffDepartment: { $in: ['', null] }, department: departmentPattern },
      ],
    }];
  }

  const [accounts, total] = await Promise.all([
    User.find(filter)
      .sort({ name: 1 })
      .skip(skip)
      .limit(limit)
      .select('-password'),
    User.countDocuments(filter),
  ]);
  return res.status(200).json({
    staff: accounts.map(publicStaffAccount),
    total,
    page,
    pages: Math.ceil(total / limit),
  });
};

const updateStaffAccount = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: 'A valid staff account ID is required' });
  }
  if (String(req.params.id) === String(req.user._id)) {
    return res.status(400).json({ message: 'You cannot edit or demote your own account' });
  }
  const staff = await User.findOne({
    _id: req.params.id,
    role: { $in: STAFF_ROLES },
    isDemo: { $ne: true },
  });
  if (!staff) return res.status(404).json({ message: 'Staff account not found' });

  const input = req.body || {};
  const fields = {
    name: input.name,
    phone: input.phone,
    role: input.role,
    staffDepartment: input.staffDepartment,
    employeeId: input.employeeId,
    currentRole: staff.role,
    currentDepartment: staff.staffDepartment || staff.department || '',
  };
  const { clean, error } = validateStaffFields(fields, { partial: true });
  if (error) return res.status(400).json({ message: error });
  if (
    String(staff._id) === String(req.user._id) &&
    clean.role !== undefined &&
    clean.role !== staff.role
  ) {
    return res.status(400).json({ message: 'You cannot demote your own account' });
  }

  const nextRole = clean.role || staff.role;
  const nextDepartment = clean.staffDepartment !== undefined
    ? clean.staffDepartment
    : (staff.staffDepartment || staff.department || '');
  if (nextRole !== 'principal' && !nextDepartment) {
    return res.status(400).json({ message: 'Department is required for faculty and HOD accounts' });
  }
  const changedFields = [];
  if (clean.name !== undefined) { staff.name = clean.name; changedFields.push('name'); }
  if (clean.phone !== undefined) { staff.phone = clean.phone; changedFields.push('phone'); }
  if (clean.role !== undefined) { staff.role = clean.role; changedFields.push('role'); }
  if (clean.employeeId !== undefined) {
    staff.registerNumber = clean.employeeId;
    changedFields.push('employee ID');
  }
  if (clean.staffDepartment !== undefined || clean.role === 'principal') {
    staff.staffDepartment = nextRole === 'principal' ? (clean.staffDepartment || '') : nextDepartment;
    staff.department = staff.staffDepartment;
    changedFields.push('department');
  } else if (staff.staffDepartment && !staff.department) {
    staff.department = staff.staffDepartment;
  }

  try {
    await staff.save();
  } catch (saveError) {
    if (isDuplicateKey(saveError)) return res.status(409).json({ message: 'Employee ID already exists' });
    throw saveError;
  }
  await recordAdminAction(
    req,
    'staff_updated',
    'User',
    staff._id,
    `${staff.name} (${staff.role}); updated ${[...new Set(changedFields)].join(', ') || 'no fields'}`
  );
  return res.status(200).json({ message: 'Staff account updated', staff: publicStaffAccount(staff) });
};

const updateStaffAccountStatus = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id) || typeof req.body?.isActive !== 'boolean') {
    return res.status(400).json({ message: 'A valid staff account and account status are required' });
  }
  if (String(req.params.id) === String(req.user._id) && req.body.isActive === false) {
    return res.status(400).json({ message: 'You cannot disable your own account' });
  }
  const staff = await User.findOne({
    _id: req.params.id,
    role: { $in: STAFF_ROLES },
    isDemo: { $ne: true },
  });
  if (!staff) return res.status(404).json({ message: 'Staff account not found' });
  const wasActive = staff.isActive !== false;
  staff.isActive = req.body.isActive;
  await staff.save();
  if (wasActive !== staff.isActive) {
    await recordAdminAction(
      req,
      staff.isActive ? 'staff_enabled' : 'staff_disabled',
      'User',
      staff._id,
      `${staff.name} (${staff.role})`
    );
  }
  return res.status(200).json({
    message: `Staff account ${staff.isActive ? 'enabled' : 'disabled'}`,
    staff: publicStaffAccount(staff),
  });
};

const resetStaffPassword = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: 'A valid staff account ID is required' });
  }
  const staff = await User.findOne({
    _id: req.params.id,
    role: { $in: STAFF_ROLES },
    isDemo: { $ne: true },
  });
  if (!staff) return res.status(404).json({ message: 'Staff account not found' });

  const temporaryPassword = generateTemporaryPassword();
  staff.password = await bcrypt.hash(temporaryPassword, 10);
  staff.passwordChangedAt = new Date();
  staff.mustChangePassword = true;
  await staff.save();
  await recordAdminAction(
    req,
    'staff_password_reset',
    'User',
    staff._id,
    `${staff.name} (${staff.role})`
  );
  return res.status(200).json({
    message: 'Temporary password generated',
    temporaryPassword,
  });
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
  createStaffAccount,
  getStaffAccounts,
  updateStaffAccount,
  updateStaffAccountStatus,
  resetStaffPassword,
  getPasswordResetRequests,
  issuePasswordResetRequest,
  dismissPasswordResetRequest,
};
