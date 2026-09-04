const router = require('express').Router();
const adminController = require('../controllers/adminController');
const { authenticate } = require('../../../core/middleware/auth');
const { authorize } = require('../../../core/middleware/rbac');
const { paginationValidator, commonValidator } = require('../../../core/validators');
const adminValidator = require('../validators/adminValidator');

// All admin routes require authentication and admin role
router.use(authenticate, authorize('admin'));

router.get('/dashboard', adminController.getDashboard);
router.get('/users', paginationValidator, adminController.getUsers);
router.post('/users', adminValidator.createUser, adminController.createUser);
router.put('/users/:id', adminValidator.updateUser, adminController.updateUser);
router.put('/users/:id/status', commonValidator.statusBoolean, adminController.updateUserStatus);
router.delete('/users/:id', adminController.deleteUser);
router.get('/clinics', paginationValidator, adminController.getClinics);
router.post('/clinics', adminValidator.createClinic, adminController.createClinic);
router.put('/clinics/:id', adminValidator.updateClinic, adminController.updateClinic);
router.put('/clinics/:id/status', commonValidator.statusBoolean, adminController.updateClinicStatus);
router.delete('/clinics/:id', adminController.deleteClinic);
router.get('/reviews/pending', paginationValidator, adminController.getPendingReviews);
router.put('/reviews/:id/approve', adminController.approveReview);
router.delete('/reviews/:id', adminController.rejectReview);
router.get('/plans', adminController.getPlans);
router.post('/plans', commonValidator.plan, adminController.createPlan);
router.put('/plans/:id', commonValidator.plan, adminController.updatePlan);
router.delete('/plans/:id', adminController.deletePlan);
router.get('/subscriptions', paginationValidator, adminController.getSubscriptions);
router.post('/subscriptions', adminValidator.assignSubscription, adminController.assignSubscription);
router.put('/subscriptions/:id', adminValidator.updateSubscription, adminController.updateSubscription);
router.delete('/subscriptions/:id', adminController.cancelClinicSubscription);
router.get('/audit-logs', paginationValidator, adminController.getAuditLogs);

module.exports = router;
