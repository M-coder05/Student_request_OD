const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const {
  getStudentProfile,
  updateStudentProfile,
  changePassword,
  getDashboardData,
} = require('../controllers/studentController');

const router = express.Router();

router.use(authMiddleware);
router.get('/profile', getStudentProfile);
router.put('/profile', updateStudentProfile);
router.put('/change-password', changePassword);
router.get('/dashboard', getDashboardData);

module.exports = router;
