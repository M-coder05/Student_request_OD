const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const requireRole = require('../middleware/requireRole');
const { downloadRequestAttachment } = require('../controllers/attachmentController');

const router = express.Router();

router.get(
  '/:requestType/:requestId/:attachmentId',
  authMiddleware,
  requireRole('student', 'admin', 'super_admin', 'demo_admin'),
  downloadRequestAttachment
);

module.exports = router;
