const mongoose = require('mongoose');

const passwordResetRequestSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    identifierUsed: { type: String, required: true },
    status: { type: String, enum: ['Pending', 'Issued', 'Dismissed', 'Completed'], default: 'Pending', required: true },
    requestedAt: { type: Date, default: Date.now, required: true },
    requestIp: { type: String, default: '' },
    handledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    handledAt: { type: Date, default: null },
    resetTokenHash: { type: String, default: '', select: false },
    resetTokenExpiresAt: { type: Date, default: null, select: false },
    resetTokenUsedAt: { type: Date, default: null, select: false },
  },
  { timestamps: true }
);

passwordResetRequestSchema.index(
  { userId: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: 'Pending' } }
);
passwordResetRequestSchema.index({ status: 1, requestedAt: -1 });
passwordResetRequestSchema.index({ resetTokenHash: 1 }, { sparse: true });

module.exports = mongoose.model('PasswordResetRequest', passwordResetRequestSchema);
