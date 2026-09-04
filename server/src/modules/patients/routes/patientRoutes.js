const router = require('express').Router({ mergeParams: true });
const patientController = require('../controllers/patientController');
const { authenticate } = require('../../../core/middleware/auth');
const { authorize, clinicAccess } = require('../../../core/middleware/rbac');
const { paginationValidator, commonValidator } = require('../../../core/validators');

router.get('/', authenticate, authorize('doctor', 'assistant', 'admin'), clinicAccess, paginationValidator, patientController.getByClinic);
router.post('/', authenticate, authorize('doctor', 'assistant'), clinicAccess, commonValidator.patientCreate, patientController.create);
router.get('/:id/history', authenticate, authorize('doctor', 'assistant', 'patient'), clinicAccess, patientController.getHistory);
router.get('/:id', authenticate, clinicAccess, patientController.getById);
router.put('/:id', authenticate, clinicAccess, commonValidator.patient, patientController.update);

module.exports = router;
