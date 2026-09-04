const router = require('express').Router({ mergeParams: true });
const prescriptionController = require('../controllers/prescriptionController');
const { authenticate } = require('../middleware/auth');
const { authorize, clinicAccess } = require('../middleware/rbac');
const { prescriptionValidator, paginationValidator } = require('../validators');
const { requireFeature } = require('../middleware/subscription');

router.get('/', authenticate, authorize('doctor'), clinicAccess, paginationValidator, prescriptionController.getByClinic);
router.post('/', authenticate, authorize('doctor'), clinicAccess, requireFeature('digital_prescriptions'), prescriptionValidator.create, prescriptionController.create);
router.get('/patient/:patientId', authenticate, authorize('doctor', 'patient'), clinicAccess, paginationValidator, prescriptionController.getByPatient);
router.get('/:id', authenticate, authorize('doctor', 'patient'), clinicAccess, prescriptionController.getById);
router.get('/:id/pdf', authenticate, authorize('doctor', 'patient'), clinicAccess, prescriptionController.downloadPdf);
router.put('/:id', authenticate, authorize('doctor'), clinicAccess, requireFeature('digital_prescriptions'), prescriptionValidator.create, prescriptionController.update);
router.post('/:id/items', authenticate, authorize('doctor'), clinicAccess, prescriptionValidator.addItem, prescriptionController.addItem);
router.delete('/:id/items/:itemId', authenticate, authorize('doctor'), clinicAccess, prescriptionController.removeItem);

module.exports = router;
