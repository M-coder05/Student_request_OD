const express = require('express');
const { registerUser, loginUser, getDemoAvailability, loginDemo, getMe } = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/demo/config', getDemoAvailability);
router.post('/demo/login', loginDemo);
router.get('/me', authMiddleware, getMe);

module.exports = router;
