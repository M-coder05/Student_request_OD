const BonafideRequest = require('../models/BonafideRequest');

const generateRequestId = (type) => {
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${type}-${Date.now().toString().slice(-6)}-${random}`;
};

const createBonafideRequest = async (req, res) => {
  const { year, semester, purpose, additionalDetails } = req.body;

  if (!year || !semester || !purpose) {
    return res.status(400).json({ message: 'Please provide year, semester and purpose' });
  }

  const request = await BonafideRequest.create({
    studentId: req.user._id,
    studentName: req.user.name,
    registerNumber: req.user.registerNumber,
    department: req.user.department,
    year,
    semester,
    purpose,
    additionalDetails: additionalDetails || '',
    status: 'Pending',
    adminRemark: '',
    requestId: generateRequestId('BONA'),
  });

  res.status(201).json({ message: 'Bonafide request submitted successfully', request });
};

const getMyBonafideRequests = async (req, res) => {
  const requests = await BonafideRequest.find({ studentId: req.user._id }).sort({ createdAt: -1 });
  res.status(200).json({ requests });
};

const getBonafideRequestById = async (req, res) => {
  const request = await BonafideRequest.findOne({ _id: req.params.id, studentId: req.user._id });

  if (!request) {
    return res.status(404).json({ message: 'Bonafide request not found' });
  }

  res.status(200).json({ request });
};

module.exports = { createBonafideRequest, getMyBonafideRequests, getBonafideRequestById };
