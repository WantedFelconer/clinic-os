const router = require('express').Router({ mergeParams: true });
const reviewController = require('../controllers/reviewController');
const { authenticate } = require('../../../core/middleware/auth');
const { authorize } = require('../../../core/middleware/rbac');
const reviewValidator = require('../validators/reviewValidator');
const { paginationValidator } = require('../../../core/validators');

router.get('/', paginationValidator, reviewController.getByClinic);
router.post('/', authenticate, authorize('patient'), reviewValidator.create, reviewController.create);
router.put('/:id/approve', authenticate, authorize('admin'), reviewController.approve);
router.delete('/:id', authenticate, authorize('admin'), reviewController.remove);

module.exports = router;
