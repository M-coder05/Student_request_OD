const mongoose = require('mongoose');

const allowedStudentSchema = new mongoose.Schema({
  registerNumber: { type: String, unique: true, trim: true, required: true },
  email: { type: String, trim: true, lowercase: true },
});

module.exports = mongoose.model('AllowedStudent', allowedStudentSchema);
