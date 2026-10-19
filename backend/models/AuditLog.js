const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    administratorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    administratorName: { type: String, required: true },
    administratorRole: { type: String, required: true },
    action: { type: String, required: true },
    recordType: { type: String, required: true },
    recordId: { type: mongoose.Schema.Types.ObjectId, required: true },
    details: { type: String, default: '' },
    isDemo: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('AuditLog', auditLogSchema);