const router = require('express').Router({ mergeParams: true });
const medicalRecordController = require('../controllers/medicalRecordController');
const { authenticate } = require('../middleware/auth');
const { authorize, clinicAccess } = require('../middleware/rbac');
const { medicalRecordValidator, paginationValidator } = require('../validators');

router.get('/', authenticate, authorize('doctor', 'assistant'), clinicAccess, paginationValidator, medicalRecordController.getByClinic);
router.post('/', authenticate, authorize('doctor'), clinicAccess, medicalRecordValidator.create, medicalRecordController.create);
router.get('/patient/:patientId', authenticate, clinicAccess, paginationValidator, medicalRecordController.getByPatient);
router.get('/:id', authenticate, clinicAccess, medicalRecordController.getById);
router.put('/:id', authenticate, authorize('doctor'), clinicAccess, medicalRecordValidator.update, medicalRecordController.update);

module.exports = router;
