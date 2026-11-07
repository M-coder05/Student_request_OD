const mongoose = require('mongoose');

const hideStorageKey = (document, value) => {
  delete value.storageKey;
  return value;
};

const attachmentSchema = new mongoose.Schema({
  originalName: { type: String, required: true, maxlength: 120 },
  mimeType: { type: String, enum: ['application/pdf', 'image/jpeg', 'image/png'], required: true },
  size: { type: Number, required: true, min: 1, max: 5 * 1024 * 1024 },
  storageKey: { type: String, required: true, select: false },
  uploadedAt: { type: Date, required: true },
}, {
  toObject: { transform: hideStorageKey },
  toJSON: {
    transform: hideStorageKey,
  },
});

const complaintSchema = new mongoose.Schema(
  {
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    studentName: { type: String, required: true },
    registerNumber: { type: String, required: true },
    department: { type: String, required: true },
    category: { type: String, required: true },
    subject: { type: String, required: true, maxlength: 200 },
    description: { type: String, required: true, maxlength: 1000 },
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
    attachments: { type: [attachmentSchema], default: undefined },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Complaint', complaintSchema);
