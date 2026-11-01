const express = require('express');
const { rateLimit } = require('express-rate-limit');
const { registerUser, loginUser, getDemoAvailability, loginDemo, getMe } = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();
const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Too many authentication attempts. Please try again later.' },
});

router.post('/register', authRateLimit, registerUser);
router.post('/login', authRateLimit, loginUser);
router.get('/demo/config', getDemoAvailability);
router.post('/demo/login', authRateLimit, loginDemo);
router.get('/me', authMiddleware, getMe);

module.exports = router;
