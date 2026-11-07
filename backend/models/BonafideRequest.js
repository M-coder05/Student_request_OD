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

const bonafideRequestSchema = new mongoose.Schema(
  {
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    studentName: { type: String, required: true },
    registerNumber: { type: String, required: true },
    department: { type: String, required: true },
    year: { type: String, required: true },
    semester: { type: String, required: true },
    purpose: {
      type: String,
      enum: ['Scholarship', 'Bank Loan', 'Passport', 'Internship', 'Higher Education', 'Bus Pass', 'Other'],
      required: true,
    },
    additionalDetails: { type: String, default: '', maxlength: 1000 },
    status: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected', 'In Progress', 'Resolved'],
      default: 'Pending',
    },
    adminRemark: { type: String, default: '' },
    requestId: { type: String, unique: true, required: true },
    verificationCode: { type: String, unique: true, sparse: true, select: false },
    certificateNumber: { type: String, default: '' },
    issuedAt: { type: Date },
    revoked: { type: Boolean, default: false },
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

module.exports = mongoose.model('BonafideRequest', bonafideRequestSchema);
