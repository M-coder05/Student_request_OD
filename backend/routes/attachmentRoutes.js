const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const { downloadRequestAttachment } = require('../controllers/attachmentController');

const router = express.Router();

router.get('/:requestType/:requestId/:attachmentId', authMiddleware, downloadRequestAttachment);

module.exports = router;
