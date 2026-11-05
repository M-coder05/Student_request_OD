const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema(
  {
    appointmentId: { type: String, required: true, unique: true, trim: true, match: /^APT-/ },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    studentName: { type: String, required: true, trim: true },
    registerNumber: { type: String, required: true, trim: true },
    department: { type: String, required: true, trim: true },
    staffId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    staffName: { type: String, required: true, trim: true },
    staffRole: { type: String, enum: ['faculty', 'hod', 'principal'], required: true },
    date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    startTime: { type: String, required: true, match: /^([01]\d|2[0-3]):[0-5]\d$/ },
    endTime: { type: String, required: true, match: /^([01]\d|2[0-3]):[0-5]\d$/ },
    purpose: { type: String, required: true, trim: true, minlength: 10, maxlength: 300 },
    status: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected', 'Rescheduled', 'Cancelled', 'Completed', 'No-show'],
      default: 'Pending',
      index: true,
    },
    slotReserved: { type: Boolean, default: true, select: false },
    staffRemark: { type: String, default: '', trim: true, maxlength: 1000 },
    isDemo: { type: Boolean, default: false, index: true },
    statusHistory: [{
      fromStatus: { type: String, default: '' },
      toStatus: { type: String, required: true },
      actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
      actorName: { type: String, required: true },
      actorRole: { type: String, required: true },
      changedAt: { type: Date, default: Date.now },
      remark: { type: String, default: '' },
    }],
  },
  { timestamps: true, autoIndex: false }
);

appointmentSchema.index(
  { staffId: 1, date: 1, startTime: 1 },
  {
    unique: true,
    partialFilterExpression: { slotReserved: true },
  }
);

appointmentSchema.pre('validate', function setSlotReservation() {
  this.slotReserved = ['Pending', 'Approved', 'Rescheduled'].includes(this.status);
});

module.exports = mongoose.model('Appointment', appointmentSchema);
