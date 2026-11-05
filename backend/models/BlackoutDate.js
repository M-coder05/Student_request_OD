const mongoose = require('mongoose');

const blackoutDateSchema = new mongoose.Schema(
  {
    staffId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    reason: { type: String, default: '', trim: true, maxlength: 200 },
  },
  { timestamps: true }
);

blackoutDateSchema.index({ staffId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('BlackoutDate', blackoutDateSchema);
