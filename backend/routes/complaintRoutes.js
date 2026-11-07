const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const { deleteRequestAttachment } = require('../controllers/attachmentController');
const {
  parseRequestAttachments,
  requireUploadAvailable,
  uploadRateLimit,
  validateRequestAttachments,
} = require('../middleware/requestAttachmentMiddleware');
const { createComplaint, getMyComplaints, getComplaintById } = require('../controllers/complaintController');

const router = express.Router();

router.use(authMiddleware);
router.post('/', uploadRateLimit, requireUploadAvailable, parseRequestAttachments, validateRequestAttachments, createComplaint);
router.get('/my', getMyComplaints);
router.delete('/:id/attachments/:attachmentId', deleteRequestAttachment('complaint'));
router.get('/:id', getComplaintById);

module.exports = router;
