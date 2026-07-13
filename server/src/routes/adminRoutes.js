const router = require('express').Router();
const adminController = require('../controllers/adminController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.use(authenticate, authorize('admin'));

router.get('/dashboard', adminController.getDashboard);
router.get('/users', adminController.getUsers);
router.put('/users/:id/status', adminController.updateUserStatus);
router.get('/clinics', adminController.getClinics);
router.get('/reviews/pending', adminController.getPendingReviews);
router.put('/reviews/:id/approve', adminController.approveReview);
router.get('/subscriptions', adminController.getSubscriptions);

module.exports = router;
