const router = require('express').Router({ mergeParams: true });
const subscriptionController = require('../controllers/subscriptionController');
const { authenticate } = require('../../../core/middleware/auth');
const { authorize, clinicAccess } = require('../../../core/middleware/rbac');

// Plans
router.get('/plans', subscriptionController.getPlans);
router.post('/plans', authenticate, authorize('admin'), subscriptionController.createPlan);
router.put('/plans/:id', authenticate, authorize('admin'), subscriptionController.updatePlan);

// Clinic subscriptions
router.get('/my', authenticate, clinicAccess, subscriptionController.getMySubscription);
router.get('/limits', authenticate, clinicAccess, subscriptionController.getLimits);
router.post('/subscribe', authenticate, authorize('doctor'), clinicAccess, subscriptionController.subscribe);
router.post('/cancel', authenticate, authorize('doctor'), clinicAccess, subscriptionController.cancelSubscription);
router.post('/renew', authenticate, authorize('doctor'), clinicAccess, subscriptionController.renewSubscription);

module.exports = router;
