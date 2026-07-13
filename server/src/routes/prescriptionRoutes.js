const router = require('express').Router({ mergeParams: true });
const prescriptionController = require('../controllers/prescriptionController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.get('/', authenticate, authorize('doctor', 'assistant'), prescriptionController.getByClinic);
router.post('/', authenticate, authorize('doctor'), prescriptionController.create);
router.get('/patient/:patientId', authenticate, prescriptionController.getByPatient);
router.get('/:id', authenticate, prescriptionController.getById);
router.post('/:id/items', authenticate, authorize('doctor'), prescriptionController.addItem);
router.delete('/:id/items/:itemId', authenticate, authorize('doctor'), prescriptionController.removeItem);

module.exports = router;
