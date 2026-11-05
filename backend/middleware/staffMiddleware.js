const STAFF_ROLES = ['faculty', 'hod', 'principal'];

const staffMiddleware = (req, res, next) => {
  if (!req.user || !STAFF_ROLES.includes(req.user.role)) {
    return res.status(403).json({ message: 'Staff access required' });
  }
  next();
};

module.exports = staffMiddleware;
