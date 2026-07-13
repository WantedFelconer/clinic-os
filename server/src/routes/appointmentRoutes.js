const router = require('express').Router({ mergeParams: true });
const appointmentController = require('../controllers/appointmentController');
const { authenticate } = require('../middleware/auth');
const { authorize, clinicAccess } = require('../middleware/rbac');

router.get('/', authenticate, clinicAccess, appointmentController.getByClinic);
router.post('/', authenticate, appointmentController.create);
router.get('/upcoming', authenticate, clinicAccess, appointmentController.getUpcoming);
router.get('/my', authenticate, authorize('patient'), appointmentController.getMyAppointments);
router.get('/:id', authenticate, appointmentController.getById);
router.put('/:id/status', authenticate, appointmentController.updateStatus);
router.put('/:id/reschedule', authenticate, appointmentController.reschedule);

module.exports = router;
