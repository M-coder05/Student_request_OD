const multer = require('multer');
const { rateLimit } = require('express-rate-limit');
const { isDemoUser } = require('../config/demo');
const { MAX_FILE_SIZE, MAX_FILES, detectMimeType, isCloudinaryConfigured, sanitizeOriginalName } = require('../utils/requestAttachments');

const uploadRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Too many upload requests. Please try again later.' },
});

const requireUploadAvailable = (req, res, next) => {
  if (!req.is('multipart/form-data')) return next();
  if (isDemoUser(req.user)) {
    return res.status(403).json({ message: 'Uploads are turned off in demo mode.' });
  }
  if (process.env.NODE_ENV === 'production' && !isCloudinaryConfigured()) {
    return res.status(503).json({ message: 'File uploads are unavailable because Cloudinary is not configured.' });
  }
  return next();
};

const parseRequestAttachments = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: MAX_FILES,
    fields: 20,
    fieldSize: 100 * 1024,
  },
}).array('attachments', MAX_FILES);

const validateRequestAttachments = (req, res, next) => {
  for (const file of req.files || []) {
    const mimeType = detectMimeType(file.buffer);
    if (!mimeType) {
      return res.status(400).json({ message: 'Attachments must be PDF, JPG or PNG files.' });
    }
    file.mimeType = mimeType;
    file.originalName = sanitizeOriginalName(file.originalname);
  }
  return next();
};

module.exports = {
  parseRequestAttachments,
  requireUploadAvailable,
  uploadRateLimit,
  validateRequestAttachments,
};
