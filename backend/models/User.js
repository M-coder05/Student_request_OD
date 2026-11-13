const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    registerNumber: { type: String, required: true, unique: true, trim: true },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    phone: { type: String, required: true, trim: true },
    department: { type: String, required: function requiredForStudents() { return this.role === 'student'; }, trim: true },
    staffDepartment: { type: String, trim: true, default: '' },
    designation: { type: String, trim: true, default: '', maxlength: 80 },
    officeLocation: { type: String, trim: true, default: '', maxlength: 80 },
    officeHours: { type: String, trim: true, default: '', maxlength: 120 },
    meetingTopics: { type: String, trim: true, default: '', maxlength: 160 },
    year: { type: String, required: function requiredForStudents() { return this.role === 'student'; }, trim: true },
    semester: { type: String, required: function requiredForStudents() { return this.role === 'student'; }, trim: true },
    password: { type: String, required: true },
    passwordChangedAt: { type: Date },
    role: { type: String, enum: ['student', 'faculty', 'hod', 'principal', 'admin', 'super_admin', 'demo_admin'], default: 'student' },
    isDemo: { type: Boolean, default: false, index: true },
    isActive: { type: Boolean, default: true },
    mustChangePassword: { type: Boolean, default: false },
    loginAttempts: { type: Number, default: 0 },
    lockUntil: { type: Date, default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
