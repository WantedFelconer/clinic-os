const router = require('express').Router();
const adminController = require('../controllers/adminController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const { paginationValidator, commonValidator } = require('../validators');

// All admin routes require authentication and admin role
router.use(authenticate, authorize('admin'));

router.get('/dashboard', adminController.getDashboard);
router.get('/users', paginationValidator, adminController.getUsers);
router.put('/users/:id/status', commonValidator.statusBoolean, adminController.updateUserStatus);
router.get('/clinics', paginationValidator, adminController.getClinics);
router.put('/clinics/:id/status', commonValidator.statusBoolean, adminController.updateClinicStatus);
router.get('/reviews/pending', paginationValidator, adminController.getPendingReviews);
router.put('/reviews/:id/approve', adminController.approveReview);
router.delete('/reviews/:id', adminController.rejectReview);
router.get('/plans', adminController.getPlans);
router.post('/plans', commonValidator.plan, adminController.createPlan);
router.put('/plans/:id', commonValidator.plan, adminController.updatePlan);
router.delete('/plans/:id', adminController.deletePlan);
router.get('/subscriptions', paginationValidator, adminController.getSubscriptions);
router.get('/audit-logs', paginationValidator, adminController.getAuditLogs);

module.exports = router;
