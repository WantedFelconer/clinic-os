const router = require('express').Router();
const authController = require('../controllers/authController');
const notificationController = require('../../communications/controllers/notificationController');
const { authenticate } = require('../../../core/middleware/auth');
const { authorize } = require('../../../core/middleware/rbac');
const { strictAuthLimiter } = require('../../../core/middleware/rateLimiters');
const authValidator = require('../validators/authValidator');
const { paginationValidator } = require('../../../core/validators');

router.post('/register', strictAuthLimiter, authValidator.register, authController.register);
router.post('/verify-otp', strictAuthLimiter, authValidator.verifyOTP, authController.verifyOTP);
router.post('/resend-otp', strictAuthLimiter, authValidator.resendOTP, authController.resendOTP);
router.post('/login', strictAuthLimiter, authValidator.login, authController.login);
router.post('/forgot-password', strictAuthLimiter, authValidator.forgotPassword, authController.forgotPassword);
router.post('/reset-password', strictAuthLimiter, authValidator.resetPassword, authController.resetPassword);

router.get('/profile', authenticate, authController.getProfile);
router.get('/me', authenticate, authController.getProfile);
router.put('/profile', authenticate, authValidator.updateProfile, authController.updateProfile);

router.get('/patient-profile', authenticate, authorize('patient'), authController.getPatientProfile);
router.get('/appointments', authenticate, authorize('patient'), paginationValidator, authController.getMyAppointments);
router.get('/medical-records', authenticate, authorize('patient'), paginationValidator, authController.getMyMedicalRecords);
router.get('/prescriptions', authenticate, authorize('patient'), paginationValidator, authController.getMyPrescriptions);
router.get('/payments', authenticate, authorize('patient'), paginationValidator, authController.getMyPayments);
router.get('/medical-reports', authenticate, authorize('patient'), paginationValidator, authController.getMyMedicalReports);

router.get('/notifications', authenticate, paginationValidator, notificationController.getNotifications);
router.put('/notifications/read-all', authenticate, notificationController.markAllNotificationsRead);
router.put('/notifications/:id/read', authenticate, notificationController.markNotificationRead);

module.exports = router;
