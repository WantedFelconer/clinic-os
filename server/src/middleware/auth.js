const jwt = require('jsonwebtoken');
const db = require('../config/database');

// Inactivity session tracker (user_id -> last_activity_timestamp_ms)
// Configurable timeout: default 30 minutes (NFR-9)
const INACTIVITY_TIMEOUT_MS = parseInt(process.env.SESSION_INACTIVITY_TIMEOUT_MS, 10) || 30 * 60 * 1000;
const userActivityMap = new Map();

// Periodic cleanup of stale activity entries (every 15 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [userId, lastActive] of userActivityMap.entries()) {
    if (now - lastActive > INACTIVITY_TIMEOUT_MS * 2) {
      userActivityMap.delete(userId);
    }
  }
}, 15 * 60 * 1000).unref();

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Inactivity timeout check (NFR-9)
    if (process.env.NODE_ENV !== 'test') {
      const lastActive = userActivityMap.get(decoded.id);
      const now = Date.now();
      if (lastActive && (now - lastActive > INACTIVITY_TIMEOUT_MS)) {
        userActivityMap.delete(decoded.id);
        return res.status(401).json({ message: 'Session expired due to inactivity. Please log in again.' });
      }
      userActivityMap.set(decoded.id, now);
    }

    const [rows] = await db.query('SELECT id, email, role, first_name, last_name, is_verified, is_active FROM users WHERE id = ?', [decoded.id]);
    if (rows.length === 0) {
      return res.status(401).json({ message: 'Invalid token. User not found.' });
    }

    const user = rows[0];
    if (!user.is_active) {
      return res.status(403).json({ message: 'Account deactivated. Contact support.' });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token.' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired.' });
    }
    next(error);
  }
};

module.exports = { authenticate, userActivityMap, INACTIVITY_TIMEOUT_MS };
