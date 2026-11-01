const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const {
  createBonafideRequest,
  getMyBonafideRequests,
  getBonafideRequestById,
  downloadBonafideCertificate,
} = require('../controllers/bonafideController');

const router = express.Router();

router.use(authMiddleware);
router.post('/', createBonafideRequest);
router.get('/my', getMyBonafideRequests);
router.get('/:id/certificate', downloadBonafideCertificate);
router.get('/:id', getBonafideRequestById);

module.exports = router;
