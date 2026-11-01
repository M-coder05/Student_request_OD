const express = require('express');
const { rateLimit } = require('express-rate-limit');
const { verifyBonafideCertificate } = require('../controllers/verificationController');

const router = express.Router();
const verificationRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});

router.get('/:code', verificationRateLimit, verifyBonafideCertificate);

module.exports = router;
