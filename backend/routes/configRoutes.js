const express = require('express');
const { isAppointmentBookingEnabled } = require('../config/featureFlags');

const router = express.Router();

router.get('/features', (req, res) => {
  res.status(200).json({ appointments: isAppointmentBookingEnabled() });
});

module.exports = router;
