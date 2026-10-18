const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const { createComplaint, getMyComplaints, getComplaintById } = require('../controllers/complaintController');

const router = express.Router();

router.use(authMiddleware);
router.post('/', createComplaint);
router.get('/my', getMyComplaints);
router.get('/:id', getComplaintById);

module.exports = router;
