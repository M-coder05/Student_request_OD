const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');
const {
  getAdminDashboard,
  getAllStudents,
  getAllUsers,
  updateUserAccess,
  getAllRequests,
  getRequestById,
  getRecentActivity,
  updateRequestStatus,
} = require('../controllers/adminController');

const router = express.Router();

router.use(authMiddleware, adminMiddleware);
router.get('/dashboard', getAdminDashboard);
router.get('/students', getAllStudents);
router.get('/users', getAllUsers);
router.patch('/users/:id/access', updateUserAccess);
router.get('/requests', getAllRequests);
router.get('/activity', getRecentActivity);
router.get('/requests/:id', getRequestById);
router.patch('/requests/:id/status', updateRequestStatus);

module.exports = router;
