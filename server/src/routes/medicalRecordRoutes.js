const router = require('express').Router({ mergeParams: true });
const medicalRecordController = require('../controllers/medicalRecordController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.get('/', authenticate, authorize('doctor', 'assistant'), medicalRecordController.getByClinic);
router.post('/', authenticate, authorize('doctor'), medicalRecordController.create);
router.get('/patient/:patientId', authenticate, medicalRecordController.getByPatient);
router.get('/:id', authenticate, medicalRecordController.getById);
router.put('/:id', authenticate, authorize('doctor'), medicalRecordController.update);

module.exports = router;
