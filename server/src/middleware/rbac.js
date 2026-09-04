const db = require('../config/database');

/**
 * Role-Based Access Control (RBAC) middleware
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required.' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden: Insufficient permissions for this action.' });
    }
    next();
  };
};

/**
 * Multi-tenant clinic scoping and access authorization middleware.
 * Verifies that the authenticated user has legitimate access to the target clinic.
 */
const clinicAccess = async (req, res, next) => {
  try {
    const clinicId = req.params.clinicId || req.params.id || req.body.clinic_id || req.query.clinic_id;
    const userId = req.user.id;
    const userRole = req.user.role;

    if (!clinicId || clinicId === '0' || clinicId === 'undefined') {
      return res.status(400).json({ message: 'Valid Clinic ID is required.' });
    }
    if (!/^[A-Za-z0-9-]{1,36}$/.test(String(clinicId))) {
      return res.status(400).json({ message: 'Clinic ID format is invalid.' });
    }

    // Verify clinic exists and is active
    const [clinicRows] = await db.query(
      'SELECT id, owner_id, is_active, timezone FROM clinics WHERE id = ?',
      [clinicId]
    );

    if (clinicRows.length === 0) {
      return res.status(404).json({ message: 'Clinic not found.' });
    }

    const clinic = clinicRows[0];
    req.clinic = clinic;

    if (!clinic.is_active) {
      return res.status(403).json({ message: 'This clinic workspace is inactive.' });
    }

    // Platform admins: Allowed for general clinic management and administrative endpoints,
    // but blocked from unrestricted EMR/Prescription clinical data access unless explicitly authorized.
    if (userRole === 'admin') {
      const isClinicalRoute = req.baseUrl.includes('/medical-records') || req.baseUrl.includes('/prescriptions');
      // If attempting to dump full clinical EMR/Rx, admins without clinical staff membership are restricted
      if (!isClinicalRoute) {
        req.isClinicAdmin = true;
        return next();
      }
    }

    // Check clinic ownership
    if (clinic.owner_id === userId) {
      req.isClinicOwner = true;
      req.clinicRole = 'doctor';
      return next();
    }

    // Check clinic staff membership
    const [staffRows] = await db.query(
      'SELECT cs.id, cs.role, cs.is_active FROM clinic_staff cs WHERE cs.clinic_id = ? AND cs.user_id = ? AND cs.is_active = 1',
      [clinicId, userId]
    );

    if (staffRows.length > 0) {
      req.clinicRole = staffRows[0].role;
      return next();
    }

    // Patients check
    if (userRole === 'patient') {
      // Patients can book appointments or submit reviews at any active clinic
      const isBookingOrReview = req.method === 'POST' && (req.baseUrl.endsWith('/appointments') || req.baseUrl.endsWith('/reviews'));
      const isPublicDiscovery = req.method === 'GET' && (req.baseUrl.endsWith('/services') || req.baseUrl.endsWith('/packages') || req.baseUrl.endsWith('/available-slots'));

      if (isBookingOrReview || isPublicDiscovery) {
        return next();
      }

      // Verify patient is registered at this clinic
      const [patientRows] = await db.query(
        'SELECT id FROM patients WHERE clinic_id = ? AND user_id = ? AND is_active = 1',
        [clinicId, userId]
      );

      if (patientRows.length > 0) {
        req.patientRecordId = patientRows[0].id;
        return next();
      }
    }

    return res.status(403).json({ message: 'Access denied: You are not authorized for this clinic workspace.' });
  } catch (error) {
    next(error);
  }
};

/**
 * Enforces that only the clinic owner or platform admin can execute the operation
 * (e.g. managing staff, updating schedules, clinic configuration).
 */
const requireClinicOwner = async (req, res, next) => {
  try {
    const clinicId = req.params.clinicId || req.params.id;
    const userId = req.user.id;

    if (req.user.role === 'admin') {
      return next();
    }

    if (req.isClinicOwner) {
      return next();
    }

    const [rows] = await db.query('SELECT owner_id FROM clinics WHERE id = ?', [clinicId]);
    if (rows.length === 0 || rows[0].owner_id !== userId) {
      return res.status(403).json({ message: 'Forbidden: Only the clinic owner can perform this operation.' });
    }

    req.isClinicOwner = true;
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Validates that a doctor is registered and active in the specified clinic.
 */
const validateDoctorClinicMembership = async (doctorId, clinicId) => {
  if (!doctorId || !clinicId) return false;

  const [rows] = await db.query(
    `SELECT u.id FROM users u
     LEFT JOIN clinics c ON c.id = ? AND c.owner_id = u.id
     LEFT JOIN clinic_staff cs ON cs.clinic_id = ? AND cs.user_id = u.id AND cs.role = 'doctor' AND cs.is_active = 1
     WHERE u.id = ? AND u.role = 'doctor' AND (u.is_active = 1 OR u.is_active = true)
       AND (c.id IS NOT NULL OR cs.id IS NOT NULL)
     LIMIT 1`,
    [clinicId, clinicId, doctorId]
  );

  return rows.length > 0;
};

module.exports = {
  authorize,
  clinicAccess,
  requireClinicOwner,
  validateDoctorClinicMembership,
};
