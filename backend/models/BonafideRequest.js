const mongoose = require('mongoose');

const bonafideRequestSchema = new mongoose.Schema(
  {
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    studentName: { type: String, required: true },
    registerNumber: { type: String, required: true },
    department: { type: String, required: true },
    year: { type: String, required: true },
    semester: { type: String, required: true },
    purpose: { type: String, required: true },
    additionalDetails: { type: String, default: '' },
    status: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected', 'In Progress', 'Resolved'],
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

module.exports = mongoose.model('BonafideRequest', bonafideRequestSchema);
