function requireRole(...allowedRoles) {
  return function (req, res, next) {
    const role = req.user?.role;

    if (!role) {
      return res.status(403).json({ success: false, message: 'Role is required.' });
    }

    if (role === 'superadmin') {
      return next();
    }

    if (!allowedRoles.includes(role)) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    next();
  };
}

module.exports = requireRole;
