const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const staffMiddleware = require('../middleware/staffMiddleware');
const {
  createBlackoutDate,
  deleteBlackoutDate,
  getMyBlackoutDates,
  getMyAvailability,
  replaceMyAvailability,
} = require('../controllers/availabilityController');

const router = express.Router();

router.use(authMiddleware, staffMiddleware);
router.get('/me', getMyAvailability);
router.put('/me', replaceMyAvailability);
router.get('/me/blackouts', getMyBlackoutDates);
router.post('/me/blackouts', createBlackoutDate);
router.delete('/me/blackouts/:id', deleteBlackoutDate);

module.exports = router;
