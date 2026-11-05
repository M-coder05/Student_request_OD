const mongoose = require('mongoose');
const Appointment = require('../models/Appointment');

const ensureAppointmentIndexes = async () => {
  await Appointment.updateMany(
    { slotReserved: { $exists: false } },
    [{
      $set: {
        slotReserved: {
          $in: ['$status', ['Pending', 'Approved', 'Rescheduled']],
        },
      },
    }]
  );
  await Appointment.syncIndexes();

  const indexes = await Appointment.collection.listIndexes().toArray();
  const slotIndex = indexes.find((index) =>
    index.key?.staffId === 1 &&
    index.key?.date === 1 &&
    index.key?.startTime === 1
  );
  if (
    !slotIndex ||
    slotIndex.unique !== true ||
    slotIndex.partialFilterExpression?.slotReserved !== true
  ) {
    throw new Error('Appointment slot reservation index is missing or misconfigured');
  }
};

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
    });

    await ensureAppointmentIndexes();
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
module.exports.ensureAppointmentIndexes = ensureAppointmentIndexes;
