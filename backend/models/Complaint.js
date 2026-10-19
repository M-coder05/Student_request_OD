const mongoose = require('mongoose');

const complaintSchema = new mongoose.Schema(
  {
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    studentName: { type: String, required: true },
    registerNumber: { type: String, required: true },
    department: { type: String, required: true },
    category: { type: String, required: true },
    subject: { type: String, required: true },
    description: { type: String, required: true },
    status: {
      type: String,
      enum: ['Pending', 'In Progress', 'Resolved', 'Rejected'],
      default: 'Pending',
    },
    adminRemark: { type: String, default: '' },
    requestId: { type: String, unique: true, required: true },
    statusHistory: [{
      fromStatus: { type: String },
      toStatus: { type: String, required: true },
      adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
      adminName: { type: String, required: true },
      changedAt: { type: Date, default: Date.now },
      remark: { type: String, default: '' },
    }],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Complaint', complaintSchema);
