const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized: No token provided' });
  }

  const token = authHeader.split(' ')[1];

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return res.status(401).json({ message: 'Unauthorized: Invalid token' });
  }
  if (!decoded || typeof decoded !== 'object' || !decoded.id) {
    return res.status(401).json({ message: 'Unauthorized: Invalid token' });
  }

  let user;
  try {
    user = await User.findById(decoded.id).select('-password');
  } catch (error) {
    console.error('[auth] User lookup failed:', error.message);
    return res.status(500).json({ message: 'An internal server error occurred' });
  }

  if (!user) {
    return res.status(401).json({ message: 'Unauthorized: User not found' });
  }
  if (user.isActive === false) {
    return res.status(401).json({ message: 'This account is disabled' });
  }
  if (user.passwordChangedAt && decoded.iat < Math.floor(user.passwordChangedAt.getTime() / 1000)) {
    return res.status(401).json({ message: 'Please log in again' });
  }

  req.user = user;
  if (
    user.mustChangePassword &&
    !(
      (req.method === 'GET' && req.baseUrl === '/api/auth' && req.path === '/me') ||
      (req.method === 'GET' && req.baseUrl === '/api/student' && req.path === '/profile') ||
      (req.method === 'PUT' && req.baseUrl === '/api/student' && req.path === '/change-password')
    )
  ) {
    return res.status(403).json({ message: 'Password change required' });
  }

  return next();
};

module.exports = authMiddleware;
