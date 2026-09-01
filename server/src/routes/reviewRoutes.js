const router = require('express').Router({ mergeParams: true });
const reviewController = require('../controllers/reviewController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const { reviewValidator, paginationValidator } = require('../validators');

router.get('/', paginationValidator, reviewController.getByClinic);
router.post('/', authenticate, authorize('patient'), reviewValidator.create, reviewController.create);
router.put('/:id/approve', authenticate, authorize('admin'), reviewController.approve);
router.delete('/:id', authenticate, authorize('admin'), reviewController.remove);

module.exports = router;
