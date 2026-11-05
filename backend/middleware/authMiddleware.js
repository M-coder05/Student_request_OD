const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized: No token provided' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return res.status(401).json({ message: 'Unauthorized: User not found' });
    }
    if (user.isActive === false) {
      return res.status(401).json({ message: 'This account is disabled' });
    }
    if (user.passwordChangedAt && decoded.iat * 1000 < user.passwordChangedAt.getTime()) {
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

    next();
  } catch (error) {
    return res.status(401).json({ message: 'Unauthorized: Invalid token' });
  }
};

module.exports = authMiddleware;
