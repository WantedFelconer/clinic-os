const router = require('express').Router({ mergeParams: true });
const paymentController = require('../controllers/paymentController');
const { authenticate } = require('../middleware/auth');
const { authorize, clinicAccess } = require('../middleware/rbac');

router.get('/', authenticate, clinicAccess, paymentController.getByClinic);
router.post('/', authenticate, paymentController.create);
router.get('/my', authenticate, authorize('patient'), paymentController.getMyPayments);
router.get('/revenue', authenticate, authorize('doctor'), paymentController.getRevenue);
router.get('/:id', authenticate, paymentController.getById);
router.put('/:id/status', authenticate, paymentController.updateStatus);

module.exports = router;
