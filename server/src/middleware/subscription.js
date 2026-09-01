const Subscription = require('../models/Subscription');

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

module.exports = { requireFeature };
