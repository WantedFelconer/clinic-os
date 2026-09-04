const router = require('express').Router();

router.use('/auth', require('./auth/routes/authRoutes'));
router.use('/clinics', require('./clinics/routes/clinicRoutes'));
router.use('/clinics/:clinicId/patients', require('./patients/routes/patientRoutes'));
router.use('/clinics/:clinicId/appointments', require('./appointments/routes/appointmentRoutes'));
router.use('/clinics/:clinicId/medical-records', require('./emr/routes/medicalRecordRoutes'));
router.use('/clinics/:clinicId/medical-reports', require('./emr/routes/medicalReportRoutes'));
router.use('/clinics/:clinicId/prescriptions', require('./prescriptions/routes/prescriptionRoutes'));
router.use('/clinics/:clinicId/payments', require('./billing/routes/paymentRoutes'));
router.use('/clinics/:clinicId/reviews', require('./reviews/routes/reviewRoutes'));
router.use('/clinics/:clinicId/subscriptions', require('./subscriptions/routes/subscriptionRoutes'));
router.use('/subscriptions', require('./subscriptions/routes/subscriptionRoutes'));
router.use('/admin', require('./admin/routes/adminRoutes'));
router.use('/messages', require('./communications/routes/messageRoutes'));
router.use('/notifications', require('./communications/routes/notificationRoutes'));
router.use('/doctors', require('./clinics/routes/doctorRoutes'));
router.use('/internal', require('./admin/routes/internalRoutes'));

module.exports = router;
