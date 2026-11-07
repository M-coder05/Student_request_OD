const express = require('express');
const { rateLimit } = require('express-rate-limit');
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
  createStaffAccount,
  getStaffAccounts,
  updateStaffAccount,
  updateStaffAccountStatus,
  resetStaffPassword,
  getPasswordResetRequests,
  issuePasswordResetRequest,
  dismissPasswordResetRequest,
} = require('../controllers/adminController');

const router = express.Router();
const requireSuperAdmin = (req, res, next) => {
  if (req.user?.role !== 'super_admin' || req.user.isDemo === true) {
    return res.status(403).json({ message: 'Super Admin access required' });
  }
  return next();
};
const staffPasswordResetRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  keyGenerator: (req) => req.user._id.toString(),
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Too many password reset attempts. Please try again later.' },
});

router.use(authMiddleware, adminMiddleware);
router.get('/staff', requireSuperAdmin, getStaffAccounts);
router.post('/staff', requireSuperAdmin, createStaffAccount);
router.put('/staff/:id', requireSuperAdmin, updateStaffAccount);
router.patch('/staff/:id/status', requireSuperAdmin, updateStaffAccountStatus);
router.post('/staff/:id/reset-password', requireSuperAdmin, staffPasswordResetRateLimit, resetStaffPassword);
router.get('/password-resets', getPasswordResetRequests);
router.post('/password-resets/:id/issue', staffPasswordResetRateLimit, issuePasswordResetRequest);
router.post('/password-resets/:id/dismiss', staffPasswordResetRateLimit, dismissPasswordResetRequest);
router.get('/dashboard', getAdminDashboard);
router.get('/students', getAllStudents);
router.get('/users', getAllUsers);
router.patch('/users/:id/access', updateUserAccess);
router.get('/requests', getAllRequests);
router.get('/activity', getRecentActivity);
router.get('/requests/:id', getRequestById);
router.patch('/requests/:id/status', updateRequestStatus);

module.exports = router;
