const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const { createLeaveRequest, getMyLeaveRequests, getLeaveRequestById } = require('../controllers/leaveController');

const router = express.Router();

router.use(authMiddleware);
router.post('/', createLeaveRequest);
router.get('/my', getMyLeaveRequests);
router.get('/:id', getLeaveRequestById);

module.exports = router;
