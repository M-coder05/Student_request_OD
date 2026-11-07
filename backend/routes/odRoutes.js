const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const { deleteRequestAttachment } = require('../controllers/attachmentController');
const {
  parseRequestAttachments,
  requireUploadAvailable,
  uploadRateLimit,
  validateRequestAttachments,
} = require('../middleware/requestAttachmentMiddleware');
const { createODRequest, getMyODRequests, getODRequestById } = require('../controllers/odController');

const router = express.Router();

router.use(authMiddleware);
router.post('/', uploadRateLimit, requireUploadAvailable, parseRequestAttachments, validateRequestAttachments, createODRequest);
router.get('/my', getMyODRequests);
router.delete('/:id/attachments/:attachmentId', deleteRequestAttachment('od'));
router.get('/:id', getODRequestById);

module.exports = router;
