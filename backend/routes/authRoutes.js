const express = require('express');
const { rateLimit, ipKeyGenerator } = require('express-rate-limit');
const { registerUser, loginUser, getDemoAvailability, loginDemo, getMe } = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();
const windowMs = 15 * 60 * 1000;
const loginRateLimit = rateLimit({
  windowMs,
  limit: 10,
  keyGenerator: (req) => `${ipKeyGenerator(req.ip)}:${(req.body?.email || req.body?.registerNumber || '').toString().toLowerCase()}`,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Too many authentication attempts. Please try again later.' },
});
const publicAuthRateLimit = rateLimit({
  windowMs,
  limit: 100,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Too many authentication attempts. Please try again later.' },
});

router.post('/register', publicAuthRateLimit, registerUser);
router.post('/login', loginRateLimit, loginUser);
router.get('/demo/config', getDemoAvailability);
router.post('/demo/login', publicAuthRateLimit, loginDemo);
router.get('/me', authMiddleware, getMe);

module.exports = router;
