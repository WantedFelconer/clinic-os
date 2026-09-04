const { Subscription } = require('../../modules/subscriptions');
const db = require('../config/database');

/**
 * Middleware that checks if a clinic's subscription includes a specific premium feature.
 * Must be used AFTER authenticate and clinicAccess middleware.
 *
 * Usage:
 *   router.get('/analytics', authenticate, clinicAccess, requireFeature('analytics'), controller.getAnalytics);
 */
const requireFeature = (featureName) => {
  return async (req, res, next) => {
    try {
      const clinicId = req.params.clinicId || req.params.id;
      if (!clinicId) {
        return res.status(400).json({ message: 'Clinic ID is required for feature authorization.' });
      }

      // Platform admins bypass feature checks
      if (req.user && req.user.role === 'admin') {
        return next();
      }

      const hasAccess = await Subscription.hasFeature(clinicId, featureName);
      if (!hasAccess) {
        const sub = await Subscription.getClinicSubscription(clinicId);
        return res.status(403).json({
          message: `Premium feature required: '${featureName}' is not included in your current plan (${sub?.plan_name || 'Free Tier'}). Please upgrade your subscription.`,
          required_feature: featureName,
          current_plan: sub?.plan_name,
          available_features: sub?.features || [],
        });
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

const requireSharedClinicFeature = (featureName) => async (req, res, next) => {
  try {
    if (req.user?.role === 'admin') return next();
    const otherUserId = req.body.receiver_id;
    if (!otherUserId) return res.status(400).json({ message: 'Receiver ID is required for feature authorization.' });
    const [clinics] = await db.execute(
      `SELECT DISTINCT c.id FROM clinics c
       LEFT JOIN clinic_staff a_staff ON a_staff.clinic_id = c.id AND a_staff.user_id = ? AND a_staff.is_active = 1
       LEFT JOIN patients a_patient ON a_patient.clinic_id = c.id AND a_patient.user_id = ? AND a_patient.is_active = 1
       LEFT JOIN clinic_staff b_staff ON b_staff.clinic_id = c.id AND b_staff.user_id = ? AND b_staff.is_active = 1
       LEFT JOIN patients b_patient ON b_patient.clinic_id = c.id AND b_patient.user_id = ? AND b_patient.is_active = 1
       WHERE (c.owner_id = ? OR a_staff.id IS NOT NULL OR a_patient.id IS NOT NULL)
         AND (c.owner_id = ? OR b_staff.id IS NOT NULL OR b_patient.id IS NOT NULL)`,
      [req.user.id, req.user.id, otherUserId, otherUserId, req.user.id, otherUserId]
    );
    for (const clinic of clinics) {
      if (await Subscription.hasFeature(clinic.id, featureName)) return next();
    }
    return res.status(403).json({ message: `Premium feature required: '${featureName}' is not enabled for the shared clinic.`, required_feature: featureName });
  } catch (error) { next(error); }
};

module.exports = { requireFeature, requireSharedClinicFeature };
