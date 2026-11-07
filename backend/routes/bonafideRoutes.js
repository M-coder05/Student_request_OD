const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const requireRole = require('../middleware/requireRole');
const { deleteRequestAttachment } = require('../controllers/attachmentController');
const {
  parseRequestAttachments,
  requireUploadAvailable,
  uploadRateLimit,
  validateRequestAttachments,
} = require('../middleware/requestAttachmentMiddleware');
const {
  createBonafideRequest,
  getMyBonafideRequests,
  getBonafideRequestById,
  downloadBonafideCertificate,
} = require('../controllers/bonafideController');

const router = express.Router();

router.use(authMiddleware, requireRole('student'));
router.post('/', uploadRateLimit, requireUploadAvailable, parseRequestAttachments, validateRequestAttachments, createBonafideRequest);
router.get('/my', getMyBonafideRequests);
router.delete('/:id/attachments/:attachmentId', deleteRequestAttachment('bonafide'));
router.get('/:id/certificate', downloadBonafideCertificate);
router.get('/:id', getBonafideRequestById);

module.exports = router;
