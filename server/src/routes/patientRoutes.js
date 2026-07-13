const router = require('express').Router({ mergeParams: true });
const patientController = require('../controllers/patientController');
const { authenticate } = require('../middleware/auth');
const { clinicAccess } = require('../middleware/rbac');

router.get('/', authenticate, clinicAccess, patientController.getByClinic);
router.post('/', authenticate, clinicAccess, patientController.create);
router.get('/:id', authenticate, patientController.getById);
router.put('/:id', authenticate, patientController.update);

module.exports = router;
