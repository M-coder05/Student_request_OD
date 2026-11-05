const express = require('express');
const { rateLimit } = require('express-rate-limit');
const authMiddleware = require('../middleware/authMiddleware');
const {
  getStudentProfile,
  updateStudentProfile,
  changePassword,
  getDashboardData,
} = require('../controllers/studentController');

const router = express.Router();
const changePasswordRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  keyGenerator: (req) => req.user._id.toString(),
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Too many password change attempts. Please try again later.' },
});

router.use(authMiddleware);
router.get('/profile', getStudentProfile);
router.put('/profile', updateStudentProfile);
router.put('/change-password', changePasswordRateLimit, changePassword);
router.get('/dashboard', getDashboardData);

module.exports = router;
