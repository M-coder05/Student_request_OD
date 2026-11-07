const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    administratorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    administratorName: { type: String },
    administratorRole: { type: String },
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    actorName: { type: String, default: '' },
    actorRole: { type: String, default: '' },
    action: { type: String, required: true },
    recordType: { type: String, required: true },
    recordId: { type: mongoose.Schema.Types.ObjectId, required: true },
    details: { type: String, default: '' },
    isDemo: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('AuditLog', auditLogSchema);