const router = require('express').Router({ mergeParams: true });
const patientController = require('../controllers/patientController');
const { authenticate } = require('../middleware/auth');
const { authorize, clinicAccess } = require('../middleware/rbac');
const { paginationValidator } = require('../validators');

router.get('/', authenticate, authorize('doctor', 'assistant', 'admin'), clinicAccess, paginationValidator, patientController.getByClinic);
router.post('/', authenticate, clinicAccess, patientController.create);
router.get('/:id/history', authenticate, clinicAccess, patientController.getHistory);
router.get('/:id', authenticate, clinicAccess, patientController.getById);
router.put('/:id', authenticate, clinicAccess, patientController.update);

module.exports = router;
