const express = require('express');
const { rateLimit } = require('express-rate-limit');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');
const {
  createAnnouncement,
  deleteAnnouncement,
  getAnnouncements,
  getManageAnnouncements,
} = require('../controllers/announcementController');

const router = express.Router();
const createAnnouncementRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  keyGenerator: (req) => req.user._id.toString(),
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Too many announcement requests. Please try again later.' },
});

router.use(authMiddleware);
router.get('/', getAnnouncements);
router.get('/manage', adminMiddleware, getManageAnnouncements);
router.post('/', adminMiddleware, createAnnouncementRateLimit, createAnnouncement);
router.delete('/:id', adminMiddleware, deleteAnnouncement);

module.exports = router;
