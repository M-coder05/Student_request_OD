const mongoose = require('mongoose');
const Availability = require('../models/Availability');
const BlackoutDate = require('../models/BlackoutDate');
const { isValidDate, timeToMinutes } = require('../utils/appointmentTime');

const getMyAvailability = async (req, res) => {
  const [availability, blackouts] = await Promise.all([
    Availability.find({ staffId: req.user._id }).sort({ weekday: 1 }),
    BlackoutDate.find({ staffId: req.user._id }).sort({ date: 1 }),
  ]);
  return res.status(200).json({ availability, blackouts });
};

const getMyBlackoutDates = async (req, res) => {
  const blackouts = await BlackoutDate.find({ staffId: req.user._id }).sort({ date: 1 });
  return res.status(200).json({ blackouts });
};

const replaceMyAvailability = async (req, res) => {
  const entries = req.body?.availability;
  if (!Array.isArray(entries)) {
    return res.status(400).json({ message: 'Availability must be an array' });
  }

  const seenWeekdays = new Set();
  for (const entry of entries) {
    const start = timeToMinutes(entry?.startTime);
    const end = timeToMinutes(entry?.endTime);
    const slotMinutes = Number(entry?.slotMinutes);
    if (
      !Number.isInteger(entry?.weekday) ||
      entry.weekday < 0 ||
      entry.weekday > 6 ||
      seenWeekdays.has(entry.weekday) ||
      start === null ||
      end === null ||
      end <= start ||
      !Number.isInteger(slotMinutes) ||
      slotMinutes < 10 ||
      slotMinutes > 60 ||
      typeof entry.active !== 'boolean'
    ) {
      return res.status(400).json({ message: 'Each weekday needs a valid time range, 10-60 minute slot length and active flag' });
    }
    seenWeekdays.add(entry.weekday);
  }

  const session = await mongoose.startSession();
  let availability = [];
  try {
    await session.withTransaction(async () => {
      await Availability.deleteMany({ staffId: req.user._id }, { session });
      if (entries.length) {
      availability = await Availability.insertMany(entries.map((entry) => ({
        staffId: req.user._id,
        weekday: entry.weekday,
        startTime: entry.startTime,
        endTime: entry.endTime,
        slotMinutes: Number(entry.slotMinutes),
        active: entry.active,
      })), { session });
      }
    });
  } finally {
    await session.endSession();
  }
  return res.status(200).json({ availability });
};

const createBlackoutDate = async (req, res) => {
  const { date, reason = '' } = req.body || {};
  if (!isValidDate(date) || typeof reason !== 'string' || reason.length > 200) {
    return res.status(400).json({ message: 'A valid date and reason of at most 200 characters are required' });
  }
  try {
    const blackout = await BlackoutDate.create({
      staffId: req.user._id,
      date,
      reason: reason.trim(),
    });
    return res.status(201).json({ blackout });
  } catch (error) {
    if (error?.code === 11000) return res.status(409).json({ message: 'Blackout date already exists' });
    throw error;
  }
};

const deleteBlackoutDate = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'A valid blackout ID is required' });
  const blackout = await BlackoutDate.findOneAndDelete({ _id: req.params.id, staffId: req.user._id });
  if (!blackout) return res.status(404).json({ message: 'Blackout date not found' });
  return res.status(200).json({ message: 'Blackout date removed' });
};

module.exports = {
  createBlackoutDate,
  deleteBlackoutDate,
  getMyBlackoutDates,
  getMyAvailability,
  replaceMyAvailability,
};
