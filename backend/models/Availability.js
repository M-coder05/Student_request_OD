const mongoose = require('mongoose');

const availabilitySchema = new mongoose.Schema(
  {
    staffId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    weekday: { type: Number, required: true, min: 0, max: 6 },
    startTime: { type: String, required: true, match: /^([01]\d|2[0-3]):[0-5]\d$/ },
    endTime: { type: String, required: true, match: /^([01]\d|2[0-3]):[0-5]\d$/ },
    slotMinutes: { type: Number, required: true, min: 10, max: 60 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

availabilitySchema.index({ staffId: 1, weekday: 1 }, { unique: true });

module.exports = mongoose.model('Availability', availabilitySchema);
