const adminMiddleware = (req, res, next) => {
  const authorizedRole = req.user && (
    (req.user.role === 'super_admin' && req.user.isDemo !== true) ||
    (req.user.role === 'admin' && req.user.isDemo !== true) ||
    (req.user.role === 'demo_admin' && req.user.isDemo === true)
  );

  if (!authorizedRole) {
    return res.status(403).json({ message: 'Forbidden: Admin access required' });
  }

  next();
};

module.exports = adminMiddleware;
