const express = require('express');
const { rateLimit, ipKeyGenerator } = require('express-rate-limit');
const {
  registerUser,
  loginUser,
  forgotPassword,
  resetPassword,
  getDemoAvailability,
  loginDemo,
  getMe,
} = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');
const normalizeLoginIdentifier = require('../utils/loginIdentifier');

const router = express.Router();
const windowMs = 15 * 60 * 1000;
const loginRateLimit = rateLimit({
  windowMs,
  limit: 10,
  keyGenerator: (req) => `${ipKeyGenerator(req.ip)}:${normalizeLoginIdentifier(req.body)}`,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Too many authentication attempts. Please try again later.' },
});
const loginIdentifierRateLimit = rateLimit({
  windowMs,
  limit: 30,
  keyGenerator: (req) => normalizeLoginIdentifier(req.body),
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
const forgotPasswordIpRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  keyGenerator: (req) => ipKeyGenerator(req.ip),
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Too many requests. Try again later.' },
});
const forgotPasswordIdentifierRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  keyGenerator: (req) => String(req.body?.identifier || '').trim().toLowerCase() || 'missing-identifier',
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Too many requests. Try again later.' },
});
const resetPasswordRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  keyGenerator: (req) => ipKeyGenerator(req.ip),
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Too many requests. Try again later.' },
});

router.post('/register', publicAuthRateLimit, registerUser);
router.post('/login', loginRateLimit, loginIdentifierRateLimit, loginUser);
router.post('/forgot-password', forgotPasswordIpRateLimit, forgotPasswordIdentifierRateLimit, forgotPassword);
router.post('/reset-password', resetPasswordRateLimit, resetPassword);
router.get('/demo/config', getDemoAvailability);
router.post('/demo/login', publicAuthRateLimit, loginDemo);
router.get('/me', authMiddleware, getMe);

module.exports = router;
