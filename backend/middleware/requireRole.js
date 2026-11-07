const requireRole = (...allowedRoles) => (req, res, next) => {
  if (!allowedRoles.includes(req.user?.role)) {
    return res.status(403).json({ message: 'Forbidden: insufficient permissions' });
  }
  return next();
};

module.exports = requireRole;
