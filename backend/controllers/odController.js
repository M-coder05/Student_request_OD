const ODRequest = require('../models/ODRequest');
const parseDate = require('../utils/parseDate');
const notifyUser = require('../utils/notifyUser');
const textLengthError = require('../utils/textLengthError');
const { createRequestWithAttachments } = require('../utils/requestAttachments');

const generateRequestId = (type) => {
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${type}-${Date.now().toString().slice(-6)}-${random}`;
};

const createODRequest = async (req, res) => {
  const { eventName, eventDate, eventLocation, organizer, reason } = req.body || {};

  if (!eventName || !eventDate || !eventLocation || !organizer || !reason) {
    return res.status(400).json({ message: 'Please provide all OD request fields' });
  }

  const lengthError = textLengthError([
    { label: 'Event name', value: eventName, maxLength: 200 },
    { label: 'Event location', value: eventLocation, maxLength: 200 },
    { label: 'Organizer', value: organizer, maxLength: 200 },
    { label: 'Reason', value: reason, maxLength: 1000 },
  ]);
  if (lengthError) {
    return res.status(400).json({ message: lengthError });
  }

  if (!parseDate(eventDate)) {
    return res.status(400).json({ message: 'Please provide a valid event date' });
  }

  const request = await createRequestWithAttachments(ODRequest, {
    studentId: req.user._id,
    studentName: req.user.name,
    registerNumber: req.user.registerNumber,
    department: req.user.department,
    eventName,
    eventDate,
    eventLocation,
    organizer,
    reason,
    status: 'Pending',
    adminRemark: '',
    requestId: generateRequestId('OD'),
  }, req.files, 'od');

  await notifyUser({
    user: req.user,
    request,
    type: 'OD',
    title: 'Request received',
    message: `We received your OD request ${request.requestId}.`,
    oldStatus: 'Submitted',
    newStatus: request.status,
  });

  res.status(201).json({ message: 'OD request submitted successfully', request });
};

const getMyODRequests = async (req, res) => {
  const requests = await ODRequest.find({ studentId: req.user._id }).sort({ createdAt: -1 });
  res.status(200).json({ requests });
};

const getODRequestById = async (req, res) => {
  const request = await ODRequest.findOne({ _id: req.params.id, studentId: req.user._id });

  if (!request) {
    return res.status(404).json({ message: 'OD request not found' });
  }

  res.status(200).json({ request });
};

module.exports = { createODRequest, getMyODRequests, getODRequestById };
