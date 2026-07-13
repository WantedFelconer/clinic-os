const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required.' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Insufficient permissions.' });
    }
    next();
  };
};

const clinicAccess = async (req, res, next) => {
  try {
    const db = require('../config/database');
    const clinicId = req.params.clinicId || req.body.clinic_id;
    const userId = req.user.id;
    const userRole = req.user.role;

    if (userRole === 'admin') return next();
    if (userRole === 'patient') return next();

    const [rows] = await db.query(
      'SELECT id FROM clinic_staff WHERE clinic_id = ? AND user_id = ? AND is_active = true',
      [clinicId, userId]
    );

    if (rows.length === 0) {
      return res.status(403).json({ message: 'Access denied. Not a member of this clinic.' });
    }

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = { authorize, clinicAccess };
