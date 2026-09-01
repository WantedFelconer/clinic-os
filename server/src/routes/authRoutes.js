const router = require('express').Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const { authValidator, paginationValidator } = require('../validators');

router.post('/register', authValidator.register, authController.register);
router.post('/verify-otp', authValidator.verifyOTP, authController.verifyOTP);
router.post('/resend-otp', authValidator.resendOTP, authController.resendOTP);
router.post('/login', authValidator.login, authController.login);
router.post('/forgot-password', authValidator.forgotPassword, authController.forgotPassword);
router.post('/reset-password', authValidator.resetPassword, authController.resetPassword);

router.get('/profile', authenticate, authController.getProfile);
router.get('/me', authenticate, authController.getProfile);
router.put('/profile', authenticate, authValidator.updateProfile, authController.updateProfile);

router.get('/patient-profile', authenticate, authorize('patient'), authController.getPatientProfile);
router.get('/appointments', authenticate, authorize('patient'), paginationValidator, authController.getMyAppointments);
router.get('/medical-records', authenticate, authorize('patient'), paginationValidator, authController.getMyMedicalRecords);
router.get('/prescriptions', authenticate, authorize('patient'), paginationValidator, authController.getMyPrescriptions);
router.get('/payments', authenticate, authorize('patient'), paginationValidator, authController.getMyPayments);

router.get('/notifications', authenticate, paginationValidator, authController.getNotifications);
router.put('/notifications/read-all', authenticate, authController.markAllNotificationsRead);
router.put('/notifications/:id/read', authenticate, authController.markNotificationRead);

module.exports = router;
