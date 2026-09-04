const router = require('express').Router({ mergeParams: true });
const appointmentController = require('../controllers/appointmentController');
const { authenticate } = require('../../../core/middleware/auth');
const { authorize, clinicAccess } = require('../../../core/middleware/rbac');
const appointmentValidator = require('../validators/appointmentValidator');
const { paginationValidator } = require('../../../core/validators');

router.get('/', authenticate, clinicAccess, appointmentValidator.list, paginationValidator, appointmentController.getByClinic);
router.post('/', authenticate, clinicAccess, appointmentValidator.create, appointmentController.create);
router.get('/upcoming', authenticate, clinicAccess, appointmentController.getUpcoming);
router.get('/my', authenticate, authorize('patient'), paginationValidator, appointmentController.getMyAppointments);
router.get('/:id', authenticate, clinicAccess, appointmentController.getById);
router.put('/:id/status', authenticate, clinicAccess, appointmentValidator.updateStatus, appointmentController.updateStatus);
router.patch('/:id/status', authenticate, clinicAccess, appointmentValidator.updateStatus, appointmentController.updateStatus);
router.put('/:id/reschedule', authenticate, clinicAccess, appointmentValidator.reschedule, appointmentController.reschedule);

module.exports = router;
