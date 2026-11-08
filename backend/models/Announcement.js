const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    message: { type: String, required: true, trim: true, maxlength: 1000 },
    audience: { type: String, enum: ['all', 'students', 'staff'], default: 'all' },
    pinned: { type: Boolean, default: false },
    expiresAt: { type: Date },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    createdByName: { type: String, required: true, trim: true },
    isDemo: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

announcementSchema.index({ isDemo: 1, createdAt: -1 });

module.exports = mongoose.model('Announcement', announcementSchema);
