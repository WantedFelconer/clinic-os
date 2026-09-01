const router = require('express').Router({ mergeParams: true });
const prescriptionController = require('../controllers/prescriptionController');
const { authenticate } = require('../middleware/auth');
const { authorize, clinicAccess } = require('../middleware/rbac');
const { prescriptionValidator, paginationValidator } = require('../validators');

router.get('/', authenticate, authorize('doctor', 'assistant'), clinicAccess, paginationValidator, prescriptionController.getByClinic);
router.post('/', authenticate, authorize('doctor'), clinicAccess, prescriptionValidator.create, prescriptionController.create);
router.get('/patient/:patientId', authenticate, clinicAccess, paginationValidator, prescriptionController.getByPatient);
router.get('/:id', authenticate, clinicAccess, prescriptionController.getById);
router.post('/:id/items', authenticate, authorize('doctor'), clinicAccess, prescriptionValidator.addItem, prescriptionController.addItem);
router.delete('/:id/items/:itemId', authenticate, authorize('doctor'), clinicAccess, prescriptionController.removeItem);

module.exports = router;
