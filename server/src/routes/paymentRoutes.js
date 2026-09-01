const router = require('express').Router({ mergeParams: true });
const paymentController = require('../controllers/paymentController');
const { authenticate } = require('../middleware/auth');
const { authorize, clinicAccess } = require('../middleware/rbac');
const { paymentValidator, paginationValidator } = require('../validators');

router.get('/', authenticate, authorize('doctor', 'assistant', 'admin'), clinicAccess, paginationValidator, paymentController.getByClinic);
router.post('/', authenticate, authorize('doctor', 'assistant'), clinicAccess, paymentValidator.create, paymentController.create);
router.get('/my', authenticate, authorize('patient'), paginationValidator, paymentController.getMyPayments);
router.get('/revenue', authenticate, authorize('doctor', 'assistant', 'admin'), clinicAccess, paymentController.getRevenue);
router.get('/:id', authenticate, clinicAccess, paymentController.getById);
router.put('/:id', authenticate, clinicAccess, paymentValidator.updateStatus, paymentController.updateStatus);
router.put('/:id/status', authenticate, clinicAccess, paymentValidator.updateStatus, paymentController.updateStatus);

module.exports = router;
