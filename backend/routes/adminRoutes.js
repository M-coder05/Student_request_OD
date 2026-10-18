const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');
const {
  getAdminDashboard,
  getAllStudents,
  getAllRequests,
  getRequestById,
  updateRequestStatus,
} = require('../controllers/adminController');

const router = express.Router();

router.use(authMiddleware, adminMiddleware);
router.get('/dashboard', getAdminDashboard);
router.get('/students', getAllStudents);
router.get('/requests', getAllRequests);
router.get('/requests/:id', getRequestById);
router.patch('/requests/:id/status', updateRequestStatus);

module.exports = router;
