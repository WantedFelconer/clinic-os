const router = require('express').Router({ mergeParams: true });
const medicalReportController = require('../controllers/medicalReportController');
const { authenticate } = require('../../../core/middleware/auth');
const { authorize, clinicAccess } = require('../../../core/middleware/rbac');
const medicalReportValidator = require('../validators/medicalReportValidator');
const { paginationValidator } = require('../../../core/validators');

router.get('/', authenticate, authorize('doctor', 'assistant'), clinicAccess, paginationValidator, medicalReportController.getByClinic);
router.post('/', authenticate, authorize('doctor', 'assistant'), clinicAccess, medicalReportValidator.create, medicalReportController.create);
router.get('/patient/:patientId', authenticate, clinicAccess, paginationValidator, medicalReportController.getByPatient);
router.get('/:id', authenticate, clinicAccess, medicalReportController.getById);
router.delete('/:id', authenticate, authorize('doctor', 'assistant'), clinicAccess, medicalReportController.delete);

module.exports = router;
