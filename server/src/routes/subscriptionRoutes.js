const router = require('express').Router({ mergeParams: true });
const subscriptionController = require('../controllers/subscriptionController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

// Plans
router.get('/plans', subscriptionController.getPlans);
router.post('/plans', authenticate, authorize('admin'), subscriptionController.createPlan);
router.put('/plans/:id', authenticate, authorize('admin'), subscriptionController.updatePlan);

// Clinic subscriptions
router.get('/my', authenticate, subscriptionController.getMySubscription);
router.post('/subscribe', authenticate, authorize('doctor'), subscriptionController.subscribe);
router.post('/cancel', authenticate, authorize('doctor'), subscriptionController.cancelSubscription);

module.exports = router;
