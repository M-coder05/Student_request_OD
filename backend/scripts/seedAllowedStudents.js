require('dotenv').config();
const fs = require('fs');
const mongoose = require('mongoose');
const AllowedStudent = require('../models/AllowedStudent');

const seedAllowedStudents = async () => {
  const csvPath = process.argv[2];
  if (!csvPath) {
    throw new Error('Usage: node backend/scripts/seedAllowedStudents.js <csv-path>');
  }

  const csv = fs.readFileSync(csvPath, 'utf8').replace(/^\uFEFF/, '');
  const registerNumbers = [...new Set(csv.split(/\r?\n/)
    .map((line) => line.split(',')[0].trim().replace(/^"|"$/g, '').trim())
    .filter((registerNumber) => registerNumber)
    .filter((registerNumber, index) => (
      index !== 0 || !['registernumber', 'register_number', 'register number']
        .includes(registerNumber.toLowerCase())
    )))];

  if (registerNumbers.length === 0) {
    throw new Error('The CSV file does not contain any register numbers');
  }
  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI must be configured');
  }

  await mongoose.connect(process.env.MONGO_URI);
  const result = await AllowedStudent.bulkWrite(registerNumbers.map((registerNumber) => ({
    updateOne: {
      filter: { registerNumber },
      update: { $setOnInsert: { registerNumber } },
      upsert: true,
    },
  })));
  console.log(`Allowed student register numbers processed: ${registerNumbers.length} (${result.upsertedCount} added)`);
};

seedAllowedStudents()
  .catch((error) => {
    console.error('Failed to seed allowed students:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  });
