const Complaint = require('../models/Complaint');

const generateRequestId = (type) => {
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${type}-${Date.now().toString().slice(-6)}-${random}`;
};

const createComplaint = async (req, res) => {
  const { category, subject, description } = req.body;

  if (!category || !subject || !description) {
    return res.status(400).json({ message: 'Please provide category, subject and description' });
  }

  const complaint = await Complaint.create({
    studentId: req.user._id,
    studentName: req.user.name,
    registerNumber: req.user.registerNumber,
    department: req.user.department,
    category,
    subject,
    description,
    status: 'Pending',
    adminRemark: '',
    requestId: generateRequestId('COMP'),
  });

  res.status(201).json({ message: 'Complaint submitted successfully', complaint });
};

const getMyComplaints = async (req, res) => {
  const complaints = await Complaint.find({ studentId: req.user._id }).sort({ createdAt: -1 });
  res.status(200).json({ complaints });
};

const getComplaintById = async (req, res) => {
  const complaint = await Complaint.findOne({ _id: req.params.id, studentId: req.user._id });

  if (!complaint) {
    return res.status(404).json({ message: 'Complaint not found' });
  }

  res.status(200).json({ complaint });
};

module.exports = { createComplaint, getMyComplaints, getComplaintById };
