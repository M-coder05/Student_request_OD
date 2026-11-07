const LeaveRequest = require('../models/LeaveRequest');
const parseDate = require('../utils/parseDate');
const notifyUser = require('../utils/notifyUser');
const textLengthError = require('../utils/textLengthError');
const { createRequestWithAttachments } = require('../utils/requestAttachments');

const generateRequestId = (type) => {
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${type}-${Date.now().toString().slice(-6)}-${random}`;
};

const createLeaveRequest = async (req, res) => {
  const { fromDate, toDate, reason } = req.body || {};

  if (!fromDate || !toDate || !reason) {
    return res.status(400).json({ message: 'Please provide from date, to date and reason' });
  }

  const lengthError = textLengthError([{ label: 'Reason', value: reason, maxLength: 1000 }]);
  if (lengthError) {
    return res.status(400).json({ message: lengthError });
  }

  const parsedFromDate = parseDate(fromDate);
  const parsedToDate = parseDate(toDate);
  if (!parsedFromDate || !parsedToDate) {
    return res.status(400).json({ message: 'Please provide valid leave dates' });
  }

  if (parsedToDate < parsedFromDate) {
    return res.status(400).json({ message: 'To date cannot be before from date' });
  }

  const request = await createRequestWithAttachments(LeaveRequest, {
    studentId: req.user._id,
    studentName: req.user.name,
    registerNumber: req.user.registerNumber,
    department: req.user.department,
    fromDate,
    toDate,
    reason,
    status: 'Pending',
    adminRemark: '',
    requestId: generateRequestId('LEAVE'),
  }, req.files, 'leave');

  await notifyUser({
    user: req.user,
    request,
    type: 'Leave',
    title: 'Request received',
    message: `We received your leave request ${request.requestId}.`,
    oldStatus: 'Submitted',
    newStatus: request.status,
  });

  res.status(201).json({ message: 'Leave request submitted successfully', request });
};

const getMyLeaveRequests = async (req, res) => {
  const requests = await LeaveRequest.find({ studentId: req.user._id }).sort({ createdAt: -1 });
  res.status(200).json({ requests });
};

const getLeaveRequestById = async (req, res) => {
  const request = await LeaveRequest.findOne({ _id: req.params.id, studentId: req.user._id });

  if (!request) {
    return res.status(404).json({ message: 'Leave request not found' });
  }

  res.status(200).json({ request });
};

module.exports = { createLeaveRequest, getMyLeaveRequests, getLeaveRequestById };
