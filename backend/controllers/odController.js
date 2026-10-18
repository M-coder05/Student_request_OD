const ODRequest = require('../models/ODRequest');

const generateRequestId = (type) => {
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${type}-${Date.now().toString().slice(-6)}-${random}`;
};

const createODRequest = async (req, res) => {
  const { eventName, eventDate, eventLocation, organizer, reason } = req.body;

  if (!eventName || !eventDate || !eventLocation || !organizer || !reason) {
    return res.status(400).json({ message: 'Please provide all OD request fields' });
  }

  const request = await ODRequest.create({
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
