// middleware/requireAuth.js
const jwt = require('jsonwebtoken');

function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ success: false, message: 'No token provided.' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret-123');
    req.user = {
      id: decoded.id || decoded.userId || decoded._id,
      role: decoded.role,
      email: decoded.email,
    };
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token.' });
  }
}

module.exports = requireAuth; // 👈 export the FUNCTION (not an object)
