const router = require('express').Router({ mergeParams: true });
const medicalReportController = require('../controllers/medicalReportController');
const { authenticate } = require('../middleware/auth');
const { authorize, clinicAccess } = require('../middleware/rbac');
const { medicalReportValidator, paginationValidator } = require('../validators');

router.get('/', authenticate, authorize('doctor', 'assistant'), clinicAccess, paginationValidator, medicalReportController.getByClinic);
router.post('/', authenticate, authorize('doctor', 'assistant'), clinicAccess, medicalReportValidator.create, medicalReportController.create);
router.get('/patient/:patientId', authenticate, clinicAccess, paginationValidator, medicalReportController.getByPatient);
router.get('/:id', authenticate, clinicAccess, medicalReportController.getById);
router.delete('/:id', authenticate, authorize('doctor', 'assistant'), clinicAccess, medicalReportController.delete);

module.exports = router;
