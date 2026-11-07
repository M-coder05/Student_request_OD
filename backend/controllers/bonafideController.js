const crypto = require('crypto');
const mongoose = require('mongoose');
const BonafideRequest = require('../models/BonafideRequest');
const notifyUser = require('../utils/notifyUser');
const generateBonafidePdf = require('../utils/bonafidePdf');
const { isDemoUser } = require('../config/demo');
const textLengthError = require('../utils/textLengthError');
const { createRequestWithAttachments } = require('../utils/requestAttachments');

const generateRequestId = (type) => {
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${type}-${Date.now().toString().slice(-6)}-${random}`;
};

const createBonafideRequest = async (req, res) => {
  const { year, semester, purpose, additionalDetails } = req.body;

  if (!year || !semester || !purpose) {
    return res.status(400).json({ message: 'Please provide year, semester and purpose' });
  }

  const lengthError = textLengthError([
    { label: 'Purpose', value: purpose, maxLength: 200 },
    { label: 'Additional details', value: additionalDetails, maxLength: 1000 },
  ]);
  if (lengthError) {
    return res.status(400).json({ message: lengthError });
  }

  const request = await createRequestWithAttachments(BonafideRequest, {
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
  }, req.files, 'bonafide');

  await notifyUser({
    user: req.user,
    request,
    type: 'Bonafide',
    title: 'Request received',
    message: `We received your Bonafide request ${request.requestId}.`,
    oldStatus: 'Submitted',
    newStatus: request.status,
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

const downloadBonafideCertificate = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: 'A valid Bonafide request ID is required' });
  }

  const request = await BonafideRequest.findOne({
    _id: req.params.id,
    studentId: req.user._id,
  }).select('+verificationCode');

  if (!request) {
    return res.status(404).json({ message: 'Bonafide request not found' });
  }

  if (request.status !== 'Approved' || request.revoked) {
    return res.status(403).json({ message: 'Certificate is available only for approved requests' });
  }

  const demo = isDemoUser(req.user);
  if (!demo && !request.verificationCode) {
    request.verificationCode = crypto.randomBytes(32).toString('base64url');
    request.certificateNumber = `BONA-${new Date().getFullYear()}-${crypto.randomBytes(5).toString('hex').toUpperCase()}`;
    request.issuedAt = new Date();
    request.revoked = false;
    await request.save();
  }

  const pdf = await generateBonafidePdf(request, { demo });
  const safeRequestId = String(request.requestId).replace(/[^a-zA-Z0-9_-]/g, '-');
  res.set({
    'Content-Type': 'application/pdf',
    'Content-Disposition': `attachment; filename="${safeRequestId}-certificate.pdf"`,
    'Content-Length': pdf.length,
    'Cache-Control': 'no-store',
  });
  return res.status(200).send(pdf);
};

const verifyBonafideCertificate = async (req, res) => {
  const { code } = req.params;
  if (!/^[A-Za-z0-9_-]{40,50}$/.test(code)) {
    return res.status(200).json({ valid: false, revoked: false });
  }

  const request = await BonafideRequest.findOne({ verificationCode: code });
  if (!request || !request.certificateNumber) {
    return res.status(200).json({ valid: false, revoked: false });
  }

  const revoked = request.revoked === true || request.status !== 'Approved';
  return res.status(200).json({
    valid: !revoked,
    revoked,
    certificateNumber: request.certificateNumber,
    studentName: request.studentName,
    department: request.department,
    issueDate: request.issuedAt,
  });
};

module.exports = {
  createBonafideRequest,
  getMyBonafideRequests,
  getBonafideRequestById,
  downloadBonafideCertificate,
  verifyBonafideCertificate,
};
