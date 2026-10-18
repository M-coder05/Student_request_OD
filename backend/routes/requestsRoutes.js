const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const LeaveRequest = require('../models/LeaveRequest');
const ODRequest = require('../models/ODRequest');
const BonafideRequest = require('../models/BonafideRequest');
const Complaint = require('../models/Complaint');

const router = express.Router();

router.use(authMiddleware);

router.get('/my', async (req, res) => {
  const [leaves, ods, bonafides, complaints] = await Promise.all([
    LeaveRequest.find({ studentId: req.user._id }).sort({ createdAt: -1 }),
    ODRequest.find({ studentId: req.user._id }).sort({ createdAt: -1 }),
    BonafideRequest.find({ studentId: req.user._id }).sort({ createdAt: -1 }),
    Complaint.find({ studentId: req.user._id }).sort({ createdAt: -1 }),
  ]);

  const requests = [
    ...leaves.map((item) => ({ ...item.toObject(), type: 'Leave' })),
    ...ods.map((item) => ({ ...item.toObject(), type: 'OD' })),
    ...bonafides.map((item) => ({ ...item.toObject(), type: 'Bonafide' })),
    ...complaints.map((item) => ({ ...item.toObject(), type: 'Complaint' })),
  ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  res.status(200).json({ requests });
});

module.exports = router;
