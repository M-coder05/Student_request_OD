const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const { deleteRequestAttachment } = require('../controllers/attachmentController');
const {
  parseRequestAttachments,
  requireUploadAvailable,
  uploadRateLimit,
  validateRequestAttachments,
} = require('../middleware/requestAttachmentMiddleware');
const { createLeaveRequest, getMyLeaveRequests, getLeaveRequestById } = require('../controllers/leaveController');

const router = express.Router();

router.use(authMiddleware);
router.post('/', uploadRateLimit, requireUploadAvailable, parseRequestAttachments, validateRequestAttachments, createLeaveRequest);
router.get('/my', getMyLeaveRequests);
router.delete('/:id/attachments/:attachmentId', deleteRequestAttachment('leave'));
router.get('/:id', getLeaveRequestById);

module.exports = router;
